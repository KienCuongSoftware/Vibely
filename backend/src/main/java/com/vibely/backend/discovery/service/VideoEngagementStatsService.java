package com.vibely.backend.discovery.service;

import com.vibely.backend.discovery.config.DiscoveryProperties;
import com.vibely.backend.discovery.repository.VideoEngagementStatsRepository;
import com.vibely.backend.interaction.CommentRepository;
import com.vibely.backend.interaction.LikeRepository;
import com.vibely.backend.interaction.VideoBookmarkRepository;
import com.vibely.backend.interaction.VideoViewRepository;
import com.vibely.backend.video.Video;
import com.vibely.backend.video.VideoRepository;
import java.time.Duration;
import java.time.LocalDateTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class VideoEngagementStatsService {
    private static final Logger log = LoggerFactory.getLogger(VideoEngagementStatsService.class);

    private final DiscoveryProperties properties;
    private final VideoEngagementStatsRepository statsRepository;
    private final VideoRepository videoRepository;
    private final LikeRepository likeRepository;
    private final CommentRepository commentRepository;
    private final VideoViewRepository videoViewRepository;
    private final VideoBookmarkRepository bookmarkRepository;
    private final ObjectProvider<VideoEngagementStatsService> self;

    public VideoEngagementStatsService(
        DiscoveryProperties properties,
        VideoEngagementStatsRepository statsRepository,
        VideoRepository videoRepository,
        LikeRepository likeRepository,
        CommentRepository commentRepository,
        VideoViewRepository videoViewRepository,
        VideoBookmarkRepository bookmarkRepository,
        ObjectProvider<VideoEngagementStatsService> self
    ) {
        this.properties = properties;
        this.statsRepository = statsRepository;
        this.videoRepository = videoRepository;
        this.likeRepository = likeRepository;
        this.commentRepository = commentRepository;
        this.videoViewRepository = videoViewRepository;
        this.bookmarkRepository = bookmarkRepository;
        this.self = self;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recompute(Video video) {
        if (video == null || video.getId() == null) {
            return;
        }
        long videoId = video.getId();
        long likes = likeRepository.countByVideoId(videoId);
        long comments = commentRepository.countByVideoId(videoId);
        long shares = Math.max(0L, video.getShareCount());
        long saves = bookmarkRepository.countByVideo_Id(videoId);
        long views = videoViewRepository.countByVideo_Id(videoId);
        long watchTimeMs = videoViewRepository.sumWatchedMsByVideoId(videoId);
        double avgCompletion = videoViewRepository.avgCompletionRateByVideoId(videoId);
        double rewatchRate = videoViewRepository.rewatchRateByVideoId(videoId);

        double viewDenom = Math.max(1.0, views);
        double shareRate = shares / viewDenom;
        double saveRate = saves / viewDenom;
        double commentRate = comments / viewDenom;

        long ageHours = Math.max(1L, Duration.between(video.getCreatedAt(), LocalDateTime.now()).toHours());
        double freshness = Math.max(0.0, 24.0 - ageHours) / 24.0;

        var weights = properties.getRanking();
        double engagementScore =
            normalizeWatchTime(watchTimeMs, views) * weights.getWatchTime()
                + clamp01(avgCompletion) * weights.getCompletion()
                + clamp01(shareRate * 20) * weights.getShare()
                + clamp01(saveRate * 25) * weights.getSave()
                + clamp01(commentRate * 30) * weights.getComment()
                + clamp01(rewatchRate) * 0.05
                + freshness * weights.getFreshness();

        double exploreScore = likes * 3 + comments * 5 + shares * 8 + views * 0.05 + freshness * 24 * 0.8 - ageHours * 0.35;
        double rankingScore = engagementScore * 100 + exploreScore;

        statsRepository.upsert(
            videoId,
            views,
            watchTimeMs,
            avgCompletion,
            rewatchRate,
            shareRate,
            saveRate,
            commentRate,
            engagementScore,
            exploreScore,
            rankingScore
        );

        videoRepository.findById(videoId).ifPresent(row -> {
            row.setExploreScore(exploreScore);
            row.setRankingScore(rankingScore);
            row.setExploreScoreUpdatedAt(LocalDateTime.now());
            videoRepository.save(row);
        });
    }

    public void recomputeSafely(Video video) {
        try {
            self.getObject().recompute(video);
        } catch (Exception ex) {
            log.warn("Failed to recompute engagement stats for video {}: {}", video.getId(), ex.getMessage());
        }
    }

    private static double normalizeWatchTime(long watchTimeMs, long views) {
        if (views <= 0) {
            return 0;
        }
        double avgSeconds = (watchTimeMs / 1000.0) / views;
        return clamp01(avgSeconds / 45.0);
    }

    private static double clamp01(double value) {
        return Math.max(0, Math.min(1, value));
    }
}
