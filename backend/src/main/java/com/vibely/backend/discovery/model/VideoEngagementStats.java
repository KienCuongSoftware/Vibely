package com.vibely.backend.discovery.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "video_engagement_stats")
public class VideoEngagementStats {
    @Id
    private Long videoId;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId
    @JoinColumn(name = "video_id")
    private com.vibely.backend.video.Video video;

    @Column(nullable = false)
    private long views;

    @Column(name = "watch_time_ms", nullable = false)
    private long watchTimeMs;

    @Column(name = "completion_rate", nullable = false)
    private double completionRate;

    @Column(name = "rewatch_rate", nullable = false)
    private double rewatchRate;

    @Column(name = "share_rate", nullable = false)
    private double shareRate;

    @Column(name = "save_rate", nullable = false)
    private double saveRate;

    @Column(name = "comment_rate", nullable = false)
    private double commentRate;

    @Column(name = "follow_conversion_rate", nullable = false)
    private double followConversionRate;

    @Column(name = "engagement_score", nullable = false)
    private double engagementScore;

    @Column(name = "explore_score", nullable = false)
    private double exploreScore;

    @Column(name = "ranking_score", nullable = false)
    private double rankingScore;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Long getVideoId() {
        return videoId;
    }

    public void setVideo(com.vibely.backend.video.Video video) {
        this.video = video;
        this.videoId = video.getId();
    }

    public double getRankingScore() {
        return rankingScore;
    }

    public void setViews(long views) {
        this.views = views;
    }

    public void setWatchTimeMs(long watchTimeMs) {
        this.watchTimeMs = watchTimeMs;
    }

    public void setCompletionRate(double completionRate) {
        this.completionRate = completionRate;
    }

    public void setRewatchRate(double rewatchRate) {
        this.rewatchRate = rewatchRate;
    }

    public void setShareRate(double shareRate) {
        this.shareRate = shareRate;
    }

    public void setSaveRate(double saveRate) {
        this.saveRate = saveRate;
    }

    public void setCommentRate(double commentRate) {
        this.commentRate = commentRate;
    }

    public void setFollowConversionRate(double followConversionRate) {
        this.followConversionRate = followConversionRate;
    }

    public void setEngagementScore(double engagementScore) {
        this.engagementScore = engagementScore;
    }

    public void setExploreScore(double exploreScore) {
        this.exploreScore = exploreScore;
    }

    public void setRankingScore(double rankingScore) {
        this.rankingScore = rankingScore;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
