package com.vibely.backend.explore.service;

import com.vibely.backend.interaction.CommentRepository;
import com.vibely.backend.interaction.LikeRepository;
import com.vibely.backend.interaction.VideoViewRepository;
import com.vibely.backend.video.Video;
import com.vibely.backend.video.VideoRepository;
import com.vibely.backend.video.VideoStatus;
import java.time.Duration;
import java.time.LocalDateTime;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ExploreRankingService {
    private final VideoRepository videoRepository;
    private final LikeRepository likeRepository;
    private final CommentRepository commentRepository;
    private final VideoViewRepository videoViewRepository;

    public ExploreRankingService(
        VideoRepository videoRepository,
        LikeRepository likeRepository,
        CommentRepository commentRepository,
        VideoViewRepository videoViewRepository
    ) {
        this.videoRepository = videoRepository;
        this.likeRepository = likeRepository;
        this.commentRepository = commentRepository;
        this.videoViewRepository = videoViewRepository;
    }

    @Transactional
    public void recomputeVideo(Video video) {
        long likes = likeRepository.countByVideoId(video.getId());
        long comments = commentRepository.countByVideoId(video.getId());
        long shares = Math.max(0L, video.getShareCount());
        long views = videoViewRepository.countByVideo_Id(video.getId());
        long ageHours = Math.max(1L, Duration.between(video.getCreatedAt(), LocalDateTime.now()).toHours());
        double freshnessBoost = Math.max(0.0, 24.0 - ageHours) * 0.8;
        double ageDecay = ageHours * 0.35;
        double score = likes * 3 + comments * 5 + shares * 8 + views * 0.05 + freshnessBoost - ageDecay;
        video.setExploreScore(score);
        video.setExploreScoreUpdatedAt(LocalDateTime.now());
        videoRepository.save(video);
    }

    @Scheduled(fixedDelayString = "${app.explore.ranking-recompute-interval-ms:300000}")
    @Transactional
    public void recomputeRecentWindow() {
        var page = videoRepository.findByStatusOrderByCreatedAtDesc(VideoStatus.READY, org.springframework.data.domain.PageRequest.of(0, 200));
        page.getContent().forEach(this::recomputeVideo);
    }
}
