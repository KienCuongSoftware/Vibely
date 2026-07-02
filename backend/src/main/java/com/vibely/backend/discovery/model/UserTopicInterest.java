package com.vibely.backend.discovery.model;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_topic_interests")
public class UserTopicInterest {
    @EmbeddedId
    private UserTopicInterestId id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("userId")
    @JoinColumn(name = "user_id")
    private com.vibely.backend.user.entity.User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("topicId")
    @JoinColumn(name = "topic_id")
    private Topic topic;

    @Column(nullable = false)
    private double score;

    @Column(name = "signal_count", nullable = false)
    private long signalCount;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public UserTopicInterest() {
    }

    public UserTopicInterest(com.vibely.backend.user.entity.User user, Topic topic) {
        this.id = new UserTopicInterestId(user.getId(), topic.getId());
        this.user = user;
        this.topic = topic;
        this.score = 0;
        this.signalCount = 0;
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public UserTopicInterestId getId() {
        return id;
    }

    public Topic getTopic() {
        return topic;
    }

    public double getScore() {
        return score;
    }

    public void setScore(double score) {
        this.score = score;
    }

    public long getSignalCount() {
        return signalCount;
    }

    public void setSignalCount(long signalCount) {
        this.signalCount = signalCount;
    }
}
