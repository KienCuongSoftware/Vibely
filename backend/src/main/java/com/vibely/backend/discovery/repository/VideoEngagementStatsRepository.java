package com.vibely.backend.discovery.repository;

import com.vibely.backend.discovery.model.VideoEngagementStats;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VideoEngagementStatsRepository extends JpaRepository<VideoEngagementStats, Long> {
    Optional<VideoEngagementStats> findByVideoId(Long videoId);
}
