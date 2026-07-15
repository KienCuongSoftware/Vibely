package com.vibely.backend.processing;

import com.vibely.backend.moderation.ModerationPublicationHoldService;
import com.vibely.backend.video.Video;
import com.vibely.backend.video.VideoRepository;
import com.vibely.backend.video.VideoStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class VideoProcessingDryRunService {

    private final VideoRepository videoRepository;
    private final VideoProcessingJobRepository jobRepository;
    private final ModerationPublicationHoldService publicationHoldService;

    public VideoProcessingDryRunService(
        VideoRepository videoRepository,
        VideoProcessingJobRepository jobRepository,
        ModerationPublicationHoldService publicationHoldService
    ) {
        this.videoRepository = videoRepository;
        this.jobRepository = jobRepository;
        this.publicationHoldService = publicationHoldService;
    }

    /**
     * Promotes a freshly uploaded {@link VideoStatus#RAW} row to {@link VideoStatus#READY} without FFmpeg
     * (used when the dedicated worker is off, e.g. local tests).
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void promoteWithoutTranscode(long videoId) {
        Video video = videoRepository.findById(videoId).orElse(null);
        if (video == null || video.getStatus() != VideoStatus.RAW) {
            return;
        }
        video.setStatus(VideoStatus.READY);
        video.setProcessingError(null);
        videoRepository.save(video);
        jobRepository.findByVideo_Id(videoId).ifPresent((job) -> {
            job.setJobState(VideoProcessingJobState.COMPLETED);
            jobRepository.save(job);
        });
        publicationHoldService.holdIfPendingModeration(video);
    }
}
