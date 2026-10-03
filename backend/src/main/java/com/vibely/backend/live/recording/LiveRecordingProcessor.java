package com.vibely.backend.live.recording;

import com.vibely.backend.live.config.LiveProperties;
import com.vibely.backend.live.entity.Live;
import com.vibely.backend.live.entity.LiveRecording;
import com.vibely.backend.live.entity.LiveRecordingSegment;
import com.vibely.backend.live.repository.LiveRecordingRepository;
import com.vibely.backend.live.repository.LiveRecordingSegmentRepository;
import com.vibely.backend.live.repository.LiveRepository;
import com.vibely.backend.processing.ProcessingProperties;
import com.vibely.backend.storage.S3ObjectUrlBuilder;
import com.vibely.backend.storage.S3Properties;
import com.vibely.backend.video.VideoCreateRequest;
import com.vibely.backend.video.VideoRepository;
import com.vibely.backend.video.VideoResponse;
import com.vibely.backend.video.service.VideoCommandService;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.stream.Stream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

/**
 * Turns the DVR files of one ended LIVE into a replay: FFmpeg concatenates and remuxes them
 * (stream copy, no re-encoding) into a faststart MP4, the MP4 is uploaded to the host's upload
 * prefix in S3, and a draft video is created through the regular video service so the existing
 * pipeline (HLS transcode, thumbnail, moderation) handles the rest.
 *
 * <p>Runs on the recording worker thread only. Retries are safe: the S3 key is deterministic and an
 * existing video for that key is reused instead of creating a second one.
 */
@Component
public class LiveRecordingProcessor {

    private static final Logger log = LoggerFactory.getLogger(LiveRecordingProcessor.class);
    /** Below the video pipeline limit (3600 s) with margin for container rounding. */
    public static final int PIPELINE_SAFE_MAX_SECONDS = 3590;

    private final LiveRecordingRepository recordingRepository;
    private final LiveRecordingSegmentRepository segmentRepository;
    private final LiveRepository liveRepository;
    private final VideoRepository videoRepository;
    private final VideoCommandService videoCommandService;
    private final ObjectProvider<S3Client> s3Client;
    private final S3ObjectUrlBuilder objectUrlBuilder;
    private final S3Properties s3Properties;
    private final ProcessingProperties processingProperties;
    private final LiveProperties.Recording config;
    private final Path dvrRoot;

    public LiveRecordingProcessor(
        LiveRecordingRepository recordingRepository,
        LiveRecordingSegmentRepository segmentRepository,
        LiveRepository liveRepository,
        VideoRepository videoRepository,
        VideoCommandService videoCommandService,
        ObjectProvider<S3Client> s3Client,
        S3ObjectUrlBuilder objectUrlBuilder,
        S3Properties s3Properties,
        ProcessingProperties processingProperties,
        LiveProperties properties
    ) {
        this.recordingRepository = recordingRepository;
        this.segmentRepository = segmentRepository;
        this.liveRepository = liveRepository;
        this.videoRepository = videoRepository;
        this.videoCommandService = videoCommandService;
        this.s3Client = s3Client;
        this.objectUrlBuilder = objectUrlBuilder;
        this.s3Properties = s3Properties;
        this.processingProperties = processingProperties;
        this.config = properties.getRecording();
        this.dvrRoot = LiveRecordingFiles.root(config.getDvrDir());
    }

    /** Processes a claimed (PROCESSING) recording. Never throws. */
    public void process(LiveRecording recording) {
        List<Path> files = existingFiles(recording.getId());
        if (files.isEmpty()) {
            fail(recording, "no_media", files);
            return;
        }
        Live live = liveRepository.findWithHostById(recording.getLiveId()).orElse(null);
        if (live == null) {
            fail(recording, "live_missing", files);
            return;
        }
        S3Client client = s3Client.getIfAvailable();
        if (client == null || !s3Properties.isEnabled()) {
            fail(recording, "storage_unavailable", files);
            return;
        }

        Path workDir = null;
        try {
            workDir = Files.createTempDirectory("vibely-live-rec-");
            Path output = workDir.resolve("replay.mp4");
            remux(files, workDir, output);
            int duration = probeDurationSeconds(workDir, output);
            if (duration <= 0) {
                fail(recording, "empty_media", files);
                return;
            }
            long size = Files.size(output);
            String key = "uploads/" + live.getHost().getId() + "/live-" + live.getPublicId() + ".mp4";
            client.putObject(
                PutObjectRequest.builder().bucket(s3Properties.getBucket()).key(key).contentType("video/mp4").build(),
                RequestBody.fromFile(output)
            );
            String url = objectUrlBuilder.toPublicHttpsUrl(key);
            Long videoId = existingVideoId(url);
            if (videoId == null) {
                videoId = createDraftVideo(live, url, duration);
            }
            if (recordingRepository.markUploaded(recording.getId(), key, videoId, duration, size, LocalDateTime.now()) == 0) {
                log.warn("live.recording.upload_state_conflict recording={}", recording.getId());
                return;
            }
            deleteFiles(files);
            log.info("live.recording.uploaded recording={} live={} durationSeconds={} bytes={}",
                recording.getId(), live.getPublicId(), duration, size);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            retryOrFail(recording, files, ex);
        } catch (Exception ex) {
            retryOrFail(recording, files, ex);
        } finally {
            deleteDirectory(workDir);
        }
    }

    /** Deletes the DVR files of a recording that will never be processed. */
    public void discardFiles(LiveRecording recording) {
        deleteFiles(existingFiles(recording.getId()));
    }

    private Long createDraftVideo(Live live, String url, int duration) {
        VideoCreateRequest request = new VideoCreateRequest();
        String title = live.getTitle();
        request.setTitle(title.length() > 120 ? title.substring(0, 120) : title);
        request.setDescription(live.getDescription());
        request.setVideoUrl(url);
        request.setDurationSeconds(duration);
        // Draft: visible to the host only until they publish it from Studio.
        request.setStudioDraft(true);
        VideoResponse created = videoCommandService.createVideo(live.getHost().getEmail(), request);
        return videoRepository.findByPublicId(created.publicId())
            .orElseThrow(() -> new IllegalStateException("Replay video was not persisted"))
            .getId();
    }

    private Long existingVideoId(String url) {
        List<Long> ids = recordingRepository.findVideoIdsByUrl(url);
        return ids.isEmpty() ? null : ids.get(0);
    }

    private void remux(List<Path> files, Path workDir, Path output) throws IOException, InterruptedException {
        Path list = workDir.resolve("segments.txt");
        List<String> lines = new ArrayList<>();
        for (Path file : files) {
            lines.add("file '" + file.toString().replace("'", "'\\''") + "'");
        }
        Files.write(list, lines, StandardCharsets.UTF_8);
        int maxSeconds = Math.max(1, Math.min(config.getMaxReplaySeconds(), PIPELINE_SAFE_MAX_SECONDS));
        run(List.of(
            processingProperties.getFfmpegPath(),
            "-hide_banner", "-nostdin", "-y",
            "-f", "concat", "-safe", "0", "-i", list.toString(),
            "-t", String.valueOf(maxSeconds),
            "-map", "0:v:0?", "-map", "0:a:0?",
            "-c", "copy",
            "-movflags", "+faststart",
            output.toString()
        ), workDir.resolve("ffmpeg.log"));
        if (!Files.isRegularFile(output) || Files.size(output) == 0) {
            throw new IOException("FFmpeg produced no output");
        }
    }

    private int probeDurationSeconds(Path workDir, Path file) throws IOException, InterruptedException {
        Path out = workDir.resolve("ffprobe.out");
        run(List.of(
            processingProperties.getFfprobePath(),
            "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            file.toString()
        ), out);
        String text = Files.readString(out, StandardCharsets.UTF_8).trim();
        try {
            return (int) Math.floor(Double.parseDouble(text));
        } catch (NumberFormatException ex) {
            return 0;
        }
    }

    private void run(List<String> command, Path logFile) throws IOException, InterruptedException {
        Process process = new ProcessBuilder(command)
            .redirectErrorStream(true)
            .redirectOutput(logFile.toFile())
            .start();
        boolean finished = process.waitFor(Math.max(1, config.getFfmpegTimeoutMinutes()), TimeUnit.MINUTES);
        if (!finished) {
            process.destroyForcibly();
            throw new IOException(command.get(0) + " timed out");
        }
        if (process.exitValue() != 0) {
            throw new IOException(command.get(0) + " exited with " + process.exitValue() + ": " + tail(logFile));
        }
    }

    private List<Path> existingFiles(Long recordingId) {
        List<Path> files = new ArrayList<>();
        for (LiveRecordingSegment segment : segmentRepository.findByRecordingIdOrderByIdAsc(recordingId)) {
            Path path = Path.of(segment.getFilePath()).toAbsolutePath().normalize();
            if (LiveRecordingFiles.isInside(dvrRoot, path) && Files.isRegularFile(path, LinkOption.NOFOLLOW_LINKS)) {
                files.add(path);
            }
        }
        return files;
    }

    private void retryOrFail(LiveRecording recording, List<Path> files, Exception ex) {
        log.warn("live.recording.process_failed recording={} attempt={} reason={}",
            recording.getId(), recording.getAttempts(), ex.getMessage() == null ? ex.getClass().getSimpleName() : ex.getMessage());
        if (recording.getAttempts() >= Math.max(1, config.getMaxAttempts())) {
            fail(recording, "processing_failed", files);
        } else {
            recordingRepository.releaseForRetry(recording.getId(), LocalDateTime.now());
        }
    }

    private void fail(LiveRecording recording, String reason, List<Path> files) {
        if (recordingRepository.markFailed(recording.getId(), reason, LocalDateTime.now()) > 0) {
            log.warn("live.recording.failed recording={} live={} reason={}", recording.getId(), recording.getLiveId(), reason);
        }
        deleteFiles(files);
    }

    private void deleteFiles(List<Path> files) {
        files.forEach(file -> LiveRecordingFiles.deleteQuietly(dvrRoot, file));
    }

    private static void deleteDirectory(Path dir) {
        if (dir == null) {
            return;
        }
        try (Stream<Path> walk = Files.walk(dir)) {
            walk.sorted(Comparator.reverseOrder()).forEach(path -> {
                try {
                    Files.deleteIfExists(path);
                } catch (IOException ignored) {
                    // temp dir; the OS cleans it eventually
                }
            });
        } catch (IOException ignored) {
            // temp dir; the OS cleans it eventually
        }
    }

    private static String tail(Path logFile) {
        try {
            String text = Files.readString(logFile, StandardCharsets.UTF_8).trim();
            return text.length() > 300 ? text.substring(text.length() - 300) : text;
        } catch (IOException ex) {
            return "";
        }
    }
}
