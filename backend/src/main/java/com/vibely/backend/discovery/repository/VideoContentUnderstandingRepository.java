package com.vibely.backend.discovery.repository;

import com.vibely.backend.discovery.model.VideoContentUnderstanding;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VideoContentUnderstandingRepository extends JpaRepository<VideoContentUnderstanding, Long> {
    Optional<VideoContentUnderstanding> findByVideoId(Long videoId);
}
