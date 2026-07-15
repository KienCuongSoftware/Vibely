package com.vibely.backend.processing;

import com.vibely.backend.moderation.ModerationPublicationHoldService;
import com.vibely.backend.video.Video;
import com.vibely.backend.video.VideoRepository;
import com.vibely.backend.video.VideoStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class VideoProcessingStateService {

    private final VideoRepository videoRepository;
    private final VideoProcessingJobRepository jobRepository;
    private final ModerationPublicationHoldService publicationHoldService;

    public VideoProcessingStateService(
        VideoRepository videoRepository,
        VideoProcessingJobRepository jobRepository,
        ModerationPublicationHoldService publicationHoldService
    ) {
        this.videoRepository = videoRepository;
        this.jobRepository = jobRepository;
        this.publicationHoldService = publicationHoldService;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void touchProcessingHeartbeat(long jobId) {
        VideoProcessingJobEntity job = jobRepository.findById(jobId).orElse(null);
        if (job == null || job.getJobState() != VideoProcessingJobState.PROCESSING) {
            return;
        }
        jobRepository.save(job);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markReadyWithArtifacts(
        long jobId,
        long videoId,
        String masterPlaylistUrl,
        Integer durationSeconds,
        String thumbnailUrl,
        Integer sourceWidthPx,
        Integer sourceHeightPx
    ) {
        VideoProcessingJobEntity job = jobRepository.findById(jobId).orElseThrow();
        Video video = videoRepository.findById(videoId).orElseThrow();
        job.setJobState(VideoProcessingJobState.COMPLETED);
        job.setLastError(null);
        video.setStatus(VideoStatus.READY);
        video.setMasterPlaylistUrl(masterPlaylistUrl);
        video.setDurationSeconds(durationSeconds);
        video.setProcessingError(null);
        if (sourceWidthPx != null && sourceWidthPx > 0 && sourceHeightPx != null && sourceHeightPx > 0) {
            video.setSourceWidthPx(sourceWidthPx);
            video.setSourceHeightPx(sourceHeightPx);
        }
        if (thumbnailUrl != null && !thumbnailUrl.isBlank()) {
            video.setThumbnailUrl(thumbnailUrl);
        }
        jobRepository.save(job);
        videoRepository.save(video);
        publicationHoldService.holdIfPendingModeration(video);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markFailure(long jobId, long videoId, String errorMessage, int maxAttempts) {
        VideoProcessingJobEntity job = jobRepository.findById(jobId).orElseThrow();
        Video video = videoRepository.findById(videoId).orElseThrow();
        String truncated = truncate(errorMessage, 2000);
        job.setAttempts(job.getAttempts() + 1);
        job.setLastError(truncated);
        video.setProcessingError(truncated);
        if (job.getAttempts() >= maxAttempts) {
            job.setJobState(VideoProcessingJobState.FAILED);
            video.setStatus(VideoStatus.FAILED);
        } else {
            job.setJobState(VideoProcessingJobState.PENDING);
            video.setStatus(VideoStatus.RAW);
        }
        jobRepository.save(job);
        videoRepository.save(video);
    }

    /**
     * Marks job and video as failed with no further automatic retries (e.g. missing source object on S3).
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markTerminalFailure(long jobId, long videoId, String errorMessage) {
        VideoProcessingJobEntity job = jobRepository.findById(jobId).orElseThrow();
        Video video = videoRepository.findById(videoId).orElseThrow();
        String truncated = truncate(errorMessage, 2000);
        // High attempt count so recovery does not treat this as a soft/retryable failure.
        job.setAttempts(Math.max(job.getAttempts(), 99));
        job.setJobState(VideoProcessingJobState.FAILED);
        job.setLastError(truncated);
        video.setStatus(VideoStatus.FAILED);
        video.setProcessingError(truncated);
        video.setMasterPlaylistUrl(null);
        jobRepository.save(job);
        videoRepository.save(video);
    }

    private static String truncate(String raw, int max) {
        if (raw == null) {
            return null;
        }
        return raw.length() <= max ? raw : raw.substring(0, max);
    }
}
