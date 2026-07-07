package com.vibely.backend.processing;

import com.vibely.backend.video.Video;
import com.vibely.backend.video.VideoRepository;
import com.vibely.backend.video.VideoStatus;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class VideoProcessingJobPickerService {

    private final VideoProcessingJobRepository jobRepository;
    private final VideoRepository videoRepository;

    public VideoProcessingJobPickerService(
        VideoProcessingJobRepository jobRepository,
        VideoRepository videoRepository
    ) {
        this.jobRepository = jobRepository;
        this.videoRepository = videoRepository;
    }

    /**
     * Atomically claims the oldest pending job and marks the video as {@link VideoStatus#PROCESSING}.
     */
    @Transactional
    public Optional<VideoPipelineWorkItem> pollNextPending() {
        Optional<VideoProcessingJobEntity> pending = jobRepository.findFirstByJobStateOrderByCreatedAtAsc(
            VideoProcessingJobState.PENDING
        );
        if (pending.isEmpty()) {
            return Optional.empty();
        }
        VideoProcessingJobEntity job = pending.get();
        Video video = videoRepository.findById(job.getVideo().getId()).orElseThrow();
        if (video.getStatus() == VideoStatus.REMOVED) {
            job.setJobState(VideoProcessingJobState.COMPLETED);
            jobRepository.save(job);
            return Optional.empty();
        }
        job.setJobState(VideoProcessingJobState.PROCESSING);
        video.setStatus(VideoStatus.PROCESSING);
        video.setProcessingError(null);
        jobRepository.save(job);
        videoRepository.save(video);
        String authorUsername = video.getAuthor().getUsername();
        if (authorUsername == null || authorUsername.isBlank()) {
            authorUsername = "vibely";
        }
        return Optional.of(
            new VideoPipelineWorkItem(
                job.getId(),
                video.getId(),
                video.getPublicId(),
                video.getAuthor().getId(),
                authorUsername.trim(),
                video.getVideoUrl(),
                video.getThumbnailUrl()
            )
        );
    }
}
