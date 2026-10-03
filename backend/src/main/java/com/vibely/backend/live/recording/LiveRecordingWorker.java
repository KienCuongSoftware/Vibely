package com.vibely.backend.live.recording;

import com.vibely.backend.live.config.LiveProperties;
import com.vibely.backend.live.entity.Live;
import com.vibely.backend.live.entity.LiveRecording;
import com.vibely.backend.live.entity.LiveRecordingStatus;
import com.vibely.backend.live.repository.LiveRecordingRepository;
import com.vibely.backend.live.repository.LiveRecordingSegmentRepository;
import com.vibely.backend.live.repository.LiveRepository;
import com.vibely.backend.video.Video;
import com.vibely.backend.video.VideoRepository;
import com.vibely.backend.video.VideoStatus;
import jakarta.annotation.PreDestroy;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.attribute.FileTime;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.RejectedExecutionException;
import java.util.stream.Stream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Drives recordings after their LIVE: RECORDING -> PROCESSING once the LIVE has been over for the
 * settle delay (SRS needs a moment to close the last file and send on_dvr), FFmpeg work on a single
 * dedicated thread, PROCESSING -> READY/FAILED from the replay video's pipeline state, and cleanup
 * of DVR files nobody references.
 *
 * <p>DVR files are on the local disk of the SRS host, so exactly one backend instance (the one
 * sharing the DVR directory with SRS) should run with recording enabled.
 */
@Component
@ConditionalOnProperty(name = "live.recording.enabled", havingValue = "true")
public class LiveRecordingWorker {

    private static final Logger log = LoggerFactory.getLogger(LiveRecordingWorker.class);
    private static final Duration CLEANUP_INTERVAL = Duration.ofHours(1);

    private final LiveRecordingRepository recordingRepository;
    private final LiveRecordingSegmentRepository segmentRepository;
    private final LiveRepository liveRepository;
    private final VideoRepository videoRepository;
    private final LiveRecordingProcessor processor;
    private final LiveRecordingService recordingService;
    private final LiveProperties.Recording config;
    private final Path dvrRoot;
    private final ExecutorService executor;
    private final Set<Long> inFlight = ConcurrentHashMap.newKeySet();
    private Instant lastCleanup = Instant.EPOCH;

    public LiveRecordingWorker(
        LiveRecordingRepository recordingRepository,
        LiveRecordingSegmentRepository segmentRepository,
        LiveRepository liveRepository,
        VideoRepository videoRepository,
        LiveRecordingProcessor processor,
        LiveRecordingService recordingService,
        LiveProperties properties
    ) {
        this.recordingRepository = recordingRepository;
        this.segmentRepository = segmentRepository;
        this.liveRepository = liveRepository;
        this.videoRepository = videoRepository;
        this.processor = processor;
        this.recordingService = recordingService;
        this.config = properties.getRecording();
        this.dvrRoot = LiveRecordingFiles.root(config.getDvrDir());
        this.executor = Executors.newSingleThreadExecutor(runnable -> {
            Thread thread = new Thread(runnable, "live-recording-worker");
            thread.setDaemon(true);
            return thread;
        });
    }

    @Scheduled(
        initialDelayString = "${live.recording.worker-interval-ms:15000}",
        fixedDelayString = "${live.recording.worker-interval-ms:15000}"
    )
    public void tick() {
        if (!recordingService.isAvailable()) {
            return;
        }
        try {
            finalizeEnded();
            resumeProcessing();
            syncReplayVideos();
            cleanupIfDue();
        } catch (RuntimeException ex) {
            log.warn("live.recording.worker_failed reason={}", ex.getClass().getSimpleName(), ex);
        }
    }

    @PreDestroy
    void shutdown() {
        executor.shutdownNow();
    }

    /** RECORDING rows whose LIVE is over: record the end if missing, then claim after the settle delay. */
    void finalizeEnded() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime settledBefore = now.minusSeconds(Math.max(0, config.getSettleSeconds()));
        for (LiveRecording recording : recordingRepository.findByStatus(LiveRecordingStatus.RECORDING)) {
            if (recording.getLiveEndedAt() == null) {
                Optional<Live> live = liveRepository.findById(recording.getLiveId());
                if (live.isPresent() && live.get().getStatus().isFinished()) {
                    LocalDateTime endedAt = live.get().getEndedAt() != null ? live.get().getEndedAt() : now;
                    recordingRepository.markLiveEnded(recording.getLiveId(), endedAt);
                }
                continue;
            }
            if (recordingRepository.claimForProcessing(recording.getId(), now, settledBefore) > 0) {
                submit(recording.getId());
            }
        }
    }

    /** PROCESSING rows without a video yet that nobody is working on: retry within the attempt budget. */
    void resumeProcessing() {
        LocalDateTime now = LocalDateTime.now();
        int maxAttempts = Math.max(1, config.getMaxAttempts());
        for (LiveRecording recording : recordingRepository.findByStatus(LiveRecordingStatus.PROCESSING)) {
            if (recording.getVideoId() != null || inFlight.contains(recording.getId())) {
                continue;
            }
            if (recordingRepository.reclaim(recording.getId(), now, now, maxAttempts) > 0) {
                submit(recording.getId());
            } else if (recording.getAttempts() >= maxAttempts) {
                processor.discardFiles(recording);
                recordingRepository.markFailed(recording.getId(), "processing_failed", now);
                log.warn("live.recording.failed recording={} reason=attempts_exhausted", recording.getId());
            }
        }
    }

    /** The replay is READY when its video is; a deleted video makes the recording DELETED. */
    void syncReplayVideos() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime pipelineDeadline = now.minusHours(Math.max(1, config.getVideoPipelineTimeoutHours()));
        for (LiveRecording recording : recordingRepository.findByStatus(LiveRecordingStatus.PROCESSING)) {
            if (recording.getVideoId() == null) {
                continue;
            }
            Optional<Video> video = videoRepository.findById(recording.getVideoId());
            if (video.isEmpty()) {
                recordingRepository.markDeleted(recording.getId(), now);
                continue;
            }
            VideoStatus status = video.get().getStatus();
            if (status == VideoStatus.READY || status == VideoStatus.REPORTED || status == VideoStatus.HIDDEN) {
                if (recordingRepository.markReady(recording.getId(), now) > 0) {
                    log.info("live.recording.ready recording={} live={}", recording.getId(), recording.getLiveId());
                }
            } else if (status == VideoStatus.FAILED) {
                recordingRepository.markFailed(recording.getId(), "video_pipeline_failed", now);
            } else if (recording.getProcessingStartedAt() != null && recording.getProcessingStartedAt().isBefore(pipelineDeadline)) {
                recordingRepository.markFailed(recording.getId(), "video_pipeline_timeout", now);
            }
        }
        for (LiveRecording recording : recordingRepository.findReadyWithoutVideo()) {
            recordingRepository.markDeleted(recording.getId(), now);
        }
    }

    /** Deletes DVR files older than the retention that no unfinished recording still needs. */
    void cleanupIfDue() {
        Instant now = Instant.now();
        if (Duration.between(lastCleanup, now).compareTo(CLEANUP_INTERVAL) < 0 || !Files.isDirectory(dvrRoot)) {
            return;
        }
        lastCleanup = now;
        Set<String> pending = new HashSet<>(segmentRepository.findPendingFilePaths(
            List.of(LiveRecordingStatus.RECORDING, LiveRecordingStatus.PROCESSING)
        ));
        FileTime cutoff = FileTime.from(now.minus(Duration.ofHours(Math.max(1, config.getOrphanFileRetentionHours()))));
        int deleted = 0;
        try (Stream<Path> walk = Files.walk(dvrRoot, 2)) {
            for (Path path : walk.filter(p -> Files.isRegularFile(p, LinkOption.NOFOLLOW_LINKS)).toList()) {
                String normalized = path.toAbsolutePath().normalize().toString();
                if (pending.contains(normalized) || !isOlderThan(path, cutoff)) {
                    continue;
                }
                LiveRecordingFiles.deleteQuietly(dvrRoot, path);
                deleted++;
            }
        } catch (IOException | RuntimeException ex) {
            log.warn("live.recording.cleanup_failed reason={}", ex.getClass().getSimpleName());
        }
        if (deleted > 0) {
            log.info("live.recording.cleanup_done files={}", deleted);
        }
    }

    private void submit(Long recordingId) {
        if (!inFlight.add(recordingId)) {
            return;
        }
        try {
            executor.execute(() -> {
                try {
                    recordingRepository.findById(recordingId)
                        .filter(recording -> recording.getStatus() == LiveRecordingStatus.PROCESSING && recording.getVideoId() == null)
                        .ifPresent(processor::process);
                } catch (RuntimeException ex) {
                    log.warn("live.recording.process_crashed recording={} reason={}", recordingId, ex.getClass().getSimpleName(), ex);
                    recordingRepository.releaseForRetry(recordingId, LocalDateTime.now());
                } finally {
                    inFlight.remove(recordingId);
                }
            });
        } catch (RejectedExecutionException ex) {
            inFlight.remove(recordingId);
            recordingRepository.releaseForRetry(recordingId, LocalDateTime.now());
        }
    }

    private static boolean isOlderThan(Path path, FileTime cutoff) {
        try {
            return Files.getLastModifiedTime(path, LinkOption.NOFOLLOW_LINKS).compareTo(cutoff) < 0;
        } catch (IOException ex) {
            return false;
        }
    }
}
