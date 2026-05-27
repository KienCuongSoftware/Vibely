package com.vibely.backend.explore;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class VideoHashtagId implements Serializable {
    @Column(name = "video_id")
    private Long videoId;
    @Column(name = "hashtag_id")
    private Long hashtagId;

    public VideoHashtagId() {
    }

    public VideoHashtagId(Long videoId, Long hashtagId) {
        this.videoId = videoId;
        this.hashtagId = hashtagId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof VideoHashtagId that)) return false;
        return Objects.equals(videoId, that.videoId) && Objects.equals(hashtagId, that.hashtagId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(videoId, hashtagId);
    }
}
