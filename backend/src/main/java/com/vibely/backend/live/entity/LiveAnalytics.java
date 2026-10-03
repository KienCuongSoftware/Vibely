package com.vibely.backend.live.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

/** Final statistics of an ended LIVE, written once. */
@Entity
@Table(name = "live_analytics")
public class LiveAnalytics {

    @Id
    @Column(name = "live_id")
    private Long liveId;

    @Column(name = "duration_seconds", nullable = false)
    private long durationSeconds;

    @Column(name = "unique_viewers", nullable = false)
    private long uniqueViewers;

    @Column(name = "total_watch_seconds", nullable = false)
    private long totalWatchSeconds;

    @Column(name = "average_watch_seconds", nullable = false)
    private long averageWatchSeconds;

    @Column(name = "average_viewers", nullable = false)
    private double averageViewers;

    @Column(name = "peak_viewers", nullable = false)
    private long peakViewers;

    @Column(name = "like_count", nullable = false)
    private long likeCount;

    @Column(name = "comment_count", nullable = false)
    private long commentCount;

    @Column(name = "reconnect_count", nullable = false)
    private int reconnectCount;

    @Column(name = "end_reason", length = 32)
    private String endReason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected LiveAnalytics() {}

    public LiveAnalytics(
        Long liveId,
        long durationSeconds,
        long uniqueViewers,
        long totalWatchSeconds,
        long peakViewers,
        long likeCount,
        long commentCount,
        int reconnectCount,
        String endReason,
        LocalDateTime createdAt
    ) {
        this.liveId = liveId;
        this.durationSeconds = Math.max(0, durationSeconds);
        this.uniqueViewers = Math.max(0, uniqueViewers);
        this.totalWatchSeconds = Math.max(0, totalWatchSeconds);
        this.averageWatchSeconds = this.uniqueViewers == 0 ? 0 : this.totalWatchSeconds / this.uniqueViewers;
        // Average concurrent viewers over the broadcast: total watch time spread over its duration.
        this.averageViewers = this.durationSeconds == 0 ? 0 : (double) this.totalWatchSeconds / this.durationSeconds;
        this.peakViewers = Math.max(0, peakViewers);
        this.likeCount = Math.max(0, likeCount);
        this.commentCount = Math.max(0, commentCount);
        this.reconnectCount = Math.max(0, reconnectCount);
        this.endReason = endReason;
        this.createdAt = createdAt;
    }

    public Long getLiveId() {
        return liveId;
    }

    public long getDurationSeconds() {
        return durationSeconds;
    }

    public long getUniqueViewers() {
        return uniqueViewers;
    }

    public long getTotalWatchSeconds() {
        return totalWatchSeconds;
    }

    public long getAverageWatchSeconds() {
        return averageWatchSeconds;
    }

    public double getAverageViewers() {
        return averageViewers;
    }

    public long getPeakViewers() {
        return peakViewers;
    }

    public long getLikeCount() {
        return likeCount;
    }

    public long getCommentCount() {
        return commentCount;
    }

    public int getReconnectCount() {
        return reconnectCount;
    }

    public String getEndReason() {
        return endReason;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
