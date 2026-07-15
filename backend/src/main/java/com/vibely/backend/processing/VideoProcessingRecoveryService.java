package com.vibely.backend.processing;

import com.vibely.backend.moderation.ModerationPublicationHoldService;
import com.vibely.backend.video.Video;
import com.vibely.backend.video.VideoRepository;
import com.vibely.backend.video.VideoStatus;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Re-queues uploads stuck in RAW/FAILED/PROCESSING so the feed is not left with a single playable video
 * while others remain on the profile grid.
 */
@Service
@ConditionalOnProperty(prefix = "app.processing.worker", name = "enabled", havingValue = "true")
public class VideoProcessingRecoveryService {

    private static final Logger log = LoggerFactory.getLogger(VideoProcessingRecoveryService.class);

    private final VideoRepository videoRepository;
    private final VideoProcessingJobRepository jobRepository;
    private final VideoProcessingEnqueueService enqueueService;
    private final ProcessingProperties processingProperties;
    private final ModerationPublicationHoldService publicationHoldService;

    public VideoProcessingRecoveryService(
        VideoRepository videoRepository,
        VideoProcessingJobRepository jobRepository,
        VideoProcessingEnqueueService enqueueService,
        ProcessingProperties processingProperties,
        ModerationPublicationHoldService publicationHoldService
    ) {
        this.videoRepository = videoRepository;
        this.jobRepository = jobRepository;
        this.enqueueService = enqueueService;
        this.processingProperties = processingProperties;
        this.publicationHoldService = publicationHoldService;
    }

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void recoverOnStartup() {
        log.info("Processing recovery: one-shot scan on startup");
        recoverStuckVideos();
    }

    @Scheduled(
        fixedDelayString = "${app.processing.recovery-interval-ms:45000}",
        initialDelayString = "${app.processing.recovery-initial-delay-ms:30000}"
    )
    @Transactional
    public void recoverStuckVideos() {
        recoverRawWithoutActiveJob();
        recoverRetryableFailures();
        recoverExhaustedFailures();
        recoverCompletedButNotReady();
        recoverStaleProcessingJobs();
    }

    private void recoverRawWithoutActiveJob() {
        List<Video> rawVideos = videoRepository
            .findByStatusOrderByCreatedAtDesc(VideoStatus.RAW, PageRequest.of(0, 32))
            .getContent();
        for (Video video : rawVideos) {
            Optional<VideoProcessingJobEntity> job = jobRepository.findByVideo_Id(video.getId());
            if (job.isEmpty()) {
                log.info("Recovery: re-enqueue RAW video without job videoId={}", video.getId());
                enqueueService.enqueueAfterVideoPersisted(video);
                continue;
            }
            VideoProcessingJobState state = job.get().getJobState();
            if (state == VideoProcessingJobState.PENDING || state == VideoProcessingJobState.PROCESSING) {
                continue;
            }
            if (state == VideoProcessingJobState.FAILED && job.get().getAttempts() >= maxAttempts()) {
                if (!canRequeueExhaustedJob(job.get())) {
                    continue;
                }
                log.warn(
                    "Recovery: re-queue exhausted job on RAW video videoId={} lastError={}",
                    video.getId(),
                    job.get().getLastError()
                );
                enqueueService.requeueExistingJob(job.get());
                continue;
            }
            log.info(
                "Recovery: reset job to PENDING for RAW video videoId={} jobState={}",
                video.getId(),
                state
            );
            resetJobToPending(job.get());
        }
    }

    private void recoverRetryableFailures() {
        List<Video> failedVideos = videoRepository
            .findByStatusOrderByCreatedAtDesc(VideoStatus.FAILED, PageRequest.of(0, 32))
            .getContent();
        for (Video video : failedVideos) {
            Optional<VideoProcessingJobEntity> job = jobRepository.findByVideo_Id(video.getId());
            if (job.isEmpty()) {
                log.info("Recovery: re-enqueue FAILED video without job videoId={}", video.getId());
                video.setStatus(VideoStatus.RAW);
                video.setProcessingError(null);
                videoRepository.save(video);
                enqueueService.enqueueAfterVideoPersisted(video);
                continue;
            }
            if (job.get().getJobState() != VideoProcessingJobState.FAILED) {
                continue;
            }
            if (job.get().getAttempts() >= maxAttempts()) {
                continue;
            }
            log.info("Recovery: retry FAILED video videoId={} attempts={}", video.getId(), job.get().getAttempts());
            video.setStatus(VideoStatus.RAW);
            video.setProcessingError(null);
            videoRepository.save(video);
            resetJobToPending(job.get());
        }
    }

    private void recoverExhaustedFailures() {
        List<Video> failedVideos = videoRepository
            .findByStatusOrderByCreatedAtDesc(VideoStatus.FAILED, PageRequest.of(0, 32))
            .getContent();
        for (Video video : failedVideos) {
            Optional<VideoProcessingJobEntity> jobOpt = jobRepository.findByVideo_Id(video.getId());
            if (jobOpt.isEmpty()) {
                continue;
            }
            VideoProcessingJobEntity job = jobOpt.get();
            if (job.getJobState() != VideoProcessingJobState.FAILED) {
                continue;
            }
            if (job.getAttempts() < maxAttempts()) {
                continue;
            }
            if (!canRequeueExhaustedJob(job)) {
                continue;
            }
            log.warn(
                "Recovery: re-queue exhausted FAILED video videoId={} attempts={} lastError={}",
                video.getId(),
                job.getAttempts(),
                job.getLastError()
            );
            video.setStatus(VideoStatus.RAW);
            video.setProcessingError(null);
            videoRepository.save(video);
            enqueueService.requeueExistingJob(job);
        }
    }

    private void recoverCompletedButNotReady() {
        List<Video> processingVideos = videoRepository
            .findByStatusOrderByCreatedAtDesc(VideoStatus.PROCESSING, PageRequest.of(0, 32))
            .getContent();
        for (Video video : processingVideos) {
            reconcileCompletedJob(video);
        }
        List<Video> failedVideos = videoRepository
            .findByStatusOrderByCreatedAtDesc(VideoStatus.FAILED, PageRequest.of(0, 32))
            .getContent();
        for (Video video : failedVideos) {
            reconcileCompletedJob(video);
        }
    }

    private void reconcileCompletedJob(Video video) {
        Optional<VideoProcessingJobEntity> jobOpt = jobRepository.findByVideo_Id(video.getId());
        if (jobOpt.isEmpty() || jobOpt.get().getJobState() != VideoProcessingJobState.COMPLETED) {
            return;
        }
        String master = video.getMasterPlaylistUrl();
        if (master != null && !master.isBlank()) {
            log.info("Recovery: promote video with completed job videoId={}", video.getId());
            video.setStatus(VideoStatus.READY);
            video.setProcessingError(null);
            videoRepository.save(video);
            publicationHoldService.holdIfPendingModeration(video);
            return;
        }
        log.warn("Recovery: completed job but missing HLS output videoId={}", video.getId());
        video.setStatus(VideoStatus.RAW);
        videoRepository.save(video);
        enqueueService.requeueExistingJob(jobOpt.get());
    }

    private void recoverStaleProcessingJobs() {
        LocalDateTime staleBefore = LocalDateTime.now().minusMinutes(staleProcessingMinutes());
        Optional<VideoProcessingJobEntity> stale = jobRepository.findFirstByJobStateAndUpdatedAtBeforeOrderByUpdatedAtAsc(
            VideoProcessingJobState.PROCESSING,
            staleBefore
        );
        while (stale.isPresent()) {
            VideoProcessingJobEntity job = stale.get();
            Video video = videoRepository.findById(job.getVideo().getId()).orElse(null);
            if (video != null && video.getStatus() == VideoStatus.PROCESSING) {
                log.warn(
                    "Recovery: stale PROCESSING job reset videoId={} jobId={} lastError={}",
                    video.getId(),
                    job.getId(),
                    job.getLastError()
                );
                video.setStatus(VideoStatus.RAW);
                videoRepository.save(video);
                resetJobToPending(job);
            } else {
                job.setJobState(VideoProcessingJobState.PENDING);
                jobRepository.save(job);
            }
            stale = jobRepository.findFirstByJobStateAndUpdatedAtBeforeOrderByUpdatedAtAsc(
                VideoProcessingJobState.PROCESSING,
                staleBefore
            );
        }
    }

    private void resetJobToPending(VideoProcessingJobEntity job) {
        job.setJobState(VideoProcessingJobState.PENDING);
        job.setLastError(null);
        jobRepository.save(job);
    }

    private boolean canRequeueExhaustedJob(VideoProcessingJobEntity job) {
        if (isNonRetryableLastError(job.getLastError())) {
            return false;
        }
        LocalDateTime cooldownBefore = LocalDateTime.now().minusMinutes(exhaustedCooldownMinutes());
        return !job.getUpdatedAt().isAfter(cooldownBefore);
    }

    /** Policy rejects / missing source must not be auto-retried after S3 cleanup. */
    private static boolean isNonRetryableLastError(String error) {
        if (error == null || error.isBlank()) {
            return false;
        }
        String lower = error.toLowerCase(Locale.ROOT);
        return lower.contains("thời lượng tối đa 60 phút")
            || lower.contains("nosuchkey")
            || lower.contains("file gốc không tồn tại");
    }

    private int maxAttempts() {
        return Math.max(1, processingProperties.getMaxJobAttempts());
    }

    private int staleProcessingMinutes() {
        return Math.max(1, processingProperties.getRecoveryStaleProcessingMinutes());
    }

    private int exhaustedCooldownMinutes() {
        return Math.max(1, processingProperties.getRecoveryExhaustedCooldownMinutes());
    }
}
