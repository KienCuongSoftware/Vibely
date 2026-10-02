package com.vibely.backend.live.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;

/**
 * Control-plane record of the SRS stream backing one LIVE. State changes go through conditional
 * repository updates; this entity is only inserted and read.
 */
@Entity
@Table(
    name = "live_media_sessions",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_live_media_sessions_live", columnNames = "live_id"),
        @UniqueConstraint(name = "uk_live_media_sessions_stream", columnNames = "stream_name")
    }
)
public class LiveMediaSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "live_id", nullable = false, updatable = false)
    private Long liveId;

    @Column(name = "stream_name", nullable = false, length = 64, updatable = false)
    private String streamName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private LiveMediaSessionStatus status = LiveMediaSessionStatus.PENDING;

    @Column(name = "publish_token_hash", length = 64)
    private String publishTokenHash;

    @Column(name = "publish_token_expires_at")
    private LocalDateTime publishTokenExpiresAt;

    @Column(name = "publisher_client_id", length = 64)
    private String publisherClientId;

    @Column(name = "last_published_at")
    private LocalDateTime lastPublishedAt;

    @Column(name = "disconnected_at")
    private LocalDateTime disconnectedAt;

    @Column(name = "publish_count", nullable = false)
    private int publishCount;

    @Column(name = "cleanup_pending", nullable = false)
    private boolean cleanupPending;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    protected LiveMediaSession() {}

    public LiveMediaSession(Long liveId, String streamName, LocalDateTime createdAt) {
        this.liveId = liveId;
        this.streamName = streamName;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public Long getLiveId() {
        return liveId;
    }

    public String getStreamName() {
        return streamName;
    }

    public LiveMediaSessionStatus getStatus() {
        return status;
    }

    public String getPublishTokenHash() {
        return publishTokenHash;
    }

    public LocalDateTime getPublishTokenExpiresAt() {
        return publishTokenExpiresAt;
    }

    public String getPublisherClientId() {
        return publisherClientId;
    }

    public LocalDateTime getLastPublishedAt() {
        return lastPublishedAt;
    }

    public LocalDateTime getDisconnectedAt() {
        return disconnectedAt;
    }

    public int getPublishCount() {
        return publishCount;
    }

    public boolean isCleanupPending() {
        return cleanupPending;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getEndedAt() {
        return endedAt;
    }

    public boolean isEnded() {
        return status == LiveMediaSessionStatus.ENDED;
    }
}
