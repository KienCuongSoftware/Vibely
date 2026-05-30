package com.vibely.backend.discovery.service;

import com.vibely.backend.discovery.config.DiscoveryProperties;
import com.vibely.backend.discovery.repository.VideoEngagementStatsRepository;
import com.vibely.backend.video.VideoRepository;
import org.springframework.stereotype.Service;

@Service
public class ForYouRankingService {
    private final DiscoveryProperties properties;
    private final VideoEngagementStatsRepository videoEngagementStatsRepository;
    private final VideoRepository videoRepository;

    public ForYouRankingService(
        DiscoveryProperties properties,
        VideoEngagementStatsRepository videoEngagementStatsRepository,
        VideoRepository videoRepository
    ) {
        this.properties = properties;
        this.videoEngagementStatsRepository = videoEngagementStatsRepository;
        this.videoRepository = videoRepository;
    }

    public double scoreVideoId(Long videoId) {
        return videoEngagementStatsRepository.findByVideoId(videoId)
            .map(stats -> stats.getRankingScore())
            .orElseGet(() -> videoRepository.findById(videoId)
                .map(v -> v.getRankingScore() != null ? v.getRankingScore() : v.getExploreScore())
                .orElse(0.0));
    }
}
