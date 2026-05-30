package com.vibely.backend.discovery.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class VideoTopicId implements Serializable {
    @Column(name = "video_id")
    private Long videoId;

    @Column(name = "topic_id")
    private Long topicId;

    public VideoTopicId() {
    }

    public VideoTopicId(Long videoId, Long topicId) {
        this.videoId = videoId;
        this.topicId = topicId;
    }

    public Long getVideoId() {
        return videoId;
    }

    public Long getTopicId() {
        return topicId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof VideoTopicId that)) {
            return false;
        }
        return Objects.equals(videoId, that.videoId) && Objects.equals(topicId, that.topicId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(videoId, topicId);
    }
}
