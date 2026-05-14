package com.vibely.backend.processing;

import com.vibely.backend.video.Video;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class VideoProcessingEnqueueService {

    private final VideoProcessingJobRepository jobRepository;
    private final ApplicationEventPublisher eventPublisher;

    public VideoProcessingEnqueueService(
        VideoProcessingJobRepository jobRepository,
        ApplicationEventPublisher eventPublisher
    ) {
        this.jobRepository = jobRepository;
        this.eventPublisher = eventPublisher;
    }

    /**
     * Creates a {@link VideoProcessingJobEntity} row and notifies listeners after commit.
     */
    @Transactional
    public void enqueueAfterVideoPersisted(Video video) {
        VideoProcessingJobEntity job = new VideoProcessingJobEntity();
        job.setVideo(video);
        job.setJobState(VideoProcessingJobState.PENDING);
        jobRepository.save(job);
        eventPublisher.publishEvent(new VideoQueuedAfterPersistEvent(this, video.getId()));
    }
}
