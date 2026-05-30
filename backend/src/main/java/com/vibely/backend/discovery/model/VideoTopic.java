package com.vibely.backend.discovery.model;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "video_topics")
public class VideoTopic {
    @EmbeddedId
    private VideoTopicId id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("videoId")
    @JoinColumn(name = "video_id")
    private com.vibely.backend.video.Video video;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("topicId")
    @JoinColumn(name = "topic_id")
    private Topic topic;

    @Column(nullable = false)
    private double score;

    @Column(nullable = false, length = 32)
    private String source = "AI";

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public VideoTopic() {
    }

    public VideoTopic(com.vibely.backend.video.Video video, Topic topic, double score, String source) {
        this.id = new VideoTopicId(video.getId(), topic.getId());
        this.video = video;
        this.topic = topic;
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

    public VideoTopicId getId() {
        return id;
    }

    public Topic getTopic() {
        return topic;
    }

    public double getScore() {
        return score;
    }
}
