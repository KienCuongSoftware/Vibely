package com.vibely.backend.live.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;

@Entity
@Table(name = "live_user_restrictions", uniqueConstraints = {
    @UniqueConstraint(name = "uk_live_user_restrictions", columnNames = {"live_id", "user_id", "restriction_type"})
})
public class LiveUserRestriction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "live_id", nullable = false, updatable = false)
    private Long liveId;

    @Column(name = "user_id", nullable = false, updatable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "restriction_type", nullable = false, length = 8, updatable = false)
    private LiveRestrictionType type;

    @Column(length = 300)
    private String reason;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Column(name = "created_by_user_id")
    private Long createdByUserId;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    protected LiveUserRestriction() {}

    public LiveUserRestriction(Long liveId, Long userId, LiveRestrictionType type) {
        this.liveId = liveId;
        this.userId = userId;
        this.type = type;
    }

    @PrePersist
    void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    public void renew(String reason, LocalDateTime expiresAt, Long createdByUserId) {
        this.reason = reason;
        this.expiresAt = expiresAt;
        this.createdByUserId = createdByUserId;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public Long getLiveId() {
        return liveId;
    }

    public Long getUserId() {
        return userId;
    }

    public LiveRestrictionType getType() {
        return type;
    }

    public String getReason() {
        return reason;
    }

    public LocalDateTime getExpiresAt() {
        return expiresAt;
    }

    public Long getCreatedByUserId() {
        return createdByUserId;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
