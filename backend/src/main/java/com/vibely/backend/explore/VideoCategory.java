package com.vibely.backend.explore;

import com.vibely.backend.video.Video;
import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "video_categories")
public class VideoCategory {
    @EmbeddedId
    private VideoCategoryId id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("videoId")
    @JoinColumn(name = "video_id")
    private Video video;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("categoryId")
    @JoinColumn(name = "category_id")
    private Category category;

    @Column(nullable = false)
    private double score;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public VideoCategory() {
    }

    public VideoCategory(Video video, Category category, double score) {
        this.id = new VideoCategoryId(video.getId(), category.getId());
        this.video = video;
        this.category = category;
        this.score = score;
        this.createdAt = LocalDateTime.now();
    }

    public VideoCategoryId getId() { return id; }
    public Category getCategory() { return category; }
}
