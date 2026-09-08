package com.vibely.backend.interaction.entity;

import com.vibely.backend.video.Video;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "video_views")
public class VideoViewEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "video_id", nullable = false)
    private Video video;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    /** Thời lượng đã phát (ms) khi client báo; null = bản ghi cũ trước khi có cột. */
    @Column(name = "watched_ms")
    private Long watchedMs;

    /** Thời lượng video theo client tại thời điểm báo (ms); có thể null. */
    @Column(name = "duration_ms")
    private Long durationMs;

    /** foryou | profile | search | other */
    @Column(name = "traffic_source", length = 16)
    private String trafficSource;

    /** Truy vấn tìm kiếm / hashtag khi nguồn là search. */
    @Column(name = "search_query", length = 80)
    private String searchQuery;

    @PrePersist
    void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (trafficSource == null || trafficSource.isBlank()) {
            trafficSource = "other";
        }
    }

    public void setVideo(Video video) {
        this.video = video;
    }

    public Long getWatchedMs() {
        return watchedMs;
    }

    public void setWatchedMs(Long watchedMs) {
        this.watchedMs = watchedMs;
    }

    public Long getDurationMs() {
        return durationMs;
    }

    public void setDurationMs(Long durationMs) {
        this.durationMs = durationMs;
    }

    public String getTrafficSource() {
        return trafficSource;
    }

    public void setTrafficSource(String trafficSource) {
        this.trafficSource = trafficSource;
    }

    public String getSearchQuery() {
        return searchQuery;
    }

    public void setSearchQuery(String searchQuery) {
        this.searchQuery = searchQuery;
    }
}
