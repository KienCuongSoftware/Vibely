package com.vibely.backend.discovery.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class UserTopicInterestId implements Serializable {
    @Column(name = "user_id")
    private Long userId;

    @Column(name = "topic_id")
    private Long topicId;

    public UserTopicInterestId() {
    }

    public UserTopicInterestId(Long userId, Long topicId) {
        this.userId = userId;
        this.topicId = topicId;
    }

    public Long getUserId() {
        return userId;
    }

    public Long getTopicId() {
        return topicId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof UserTopicInterestId that)) {
            return false;
        }
        return Objects.equals(userId, that.userId) && Objects.equals(topicId, that.topicId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(userId, topicId);
    }
}
