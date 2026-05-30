package com.vibely.backend.discovery.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class VideoCategoryScoreId implements Serializable {
    @Column(name = "video_id")
    private Long videoId;

    @Column(name = "category_id")
    private Long categoryId;

    public VideoCategoryScoreId() {
    }

    public VideoCategoryScoreId(Long videoId, Long categoryId) {
        this.videoId = videoId;
        this.categoryId = categoryId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof VideoCategoryScoreId that)) {
            return false;
        }
        return Objects.equals(videoId, that.videoId) && Objects.equals(categoryId, that.categoryId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(videoId, categoryId);
    }
}
