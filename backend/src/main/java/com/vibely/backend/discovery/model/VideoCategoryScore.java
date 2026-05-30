package com.vibely.backend.discovery.model;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "video_category_scores")
public class VideoCategoryScore {
    @EmbeddedId
    private VideoCategoryScoreId id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("videoId")
    @JoinColumn(name = "video_id")
    private com.vibely.backend.video.Video video;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("categoryId")
    @JoinColumn(name = "category_id")
    private com.vibely.backend.explore.Category category;

    @Column(nullable = false)
    private double score;

    @Column(nullable = false, length = 32)
    private String source = "AI";

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public VideoCategoryScore() {
    }

    public VideoCategoryScore(com.vibely.backend.video.Video video, com.vibely.backend.explore.Category category, double score, String source) {
        this.id = new VideoCategoryScoreId(video.getId(), category.getId());
        this.video = video;
        this.category = category;
        this.score = score;
        this.source = source;
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PrePersist
    void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) {
            createdAt = now;
        }
        if (updatedAt == null) {
            updatedAt = now;
        }
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
