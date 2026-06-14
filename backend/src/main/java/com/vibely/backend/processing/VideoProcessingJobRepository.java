package com.vibely.backend.processing;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VideoProcessingJobRepository extends JpaRepository<VideoProcessingJobEntity, Long> {

    Optional<VideoProcessingJobEntity> findByVideo_Id(Long videoId);

    Optional<VideoProcessingJobEntity> findFirstByJobStateOrderByCreatedAtAsc(VideoProcessingJobState jobState);

    Optional<VideoProcessingJobEntity> findFirstByJobStateAndUpdatedAtBeforeOrderByUpdatedAtAsc(
        VideoProcessingJobState jobState,
        java.time.LocalDateTime updatedBefore
    );
}
