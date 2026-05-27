package com.vibely.backend.explore;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class VideoCategoryId implements Serializable {
    @Column(name = "video_id")
    private Long videoId;
    @Column(name = "category_id")
    private Long categoryId;

    public VideoCategoryId() {
    }

    public VideoCategoryId(Long videoId, Long categoryId) {
        this.videoId = videoId;
        this.categoryId = categoryId;
    }

    public Long getVideoId() { return videoId; }
    public Long getCategoryId() { return categoryId; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof VideoCategoryId that)) return false;
        return Objects.equals(videoId, that.videoId) && Objects.equals(categoryId, that.categoryId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(videoId, categoryId);
    }
}
