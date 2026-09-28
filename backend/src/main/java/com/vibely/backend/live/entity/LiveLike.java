package com.vibely.backend.live.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;

/** Per-user like total for a LIVE, flushed from the realtime counter in batches. */
@Entity
@Table(name = "live_likes", uniqueConstraints = {
    @UniqueConstraint(name = "uk_live_likes_live_user", columnNames = {"live_id", "user_id"})
})
public class LiveLike {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "live_id", nullable = false, updatable = false)
    private Long liveId;

    @Column(name = "user_id", nullable = false, updatable = false)
    private Long userId;

    @Column(name = "like_count", nullable = false)
    private long likeCount;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected LiveLike() {}

    public LiveLike(Long liveId, Long userId, long likeCount) {
        this.liveId = liveId;
        this.userId = userId;
        this.likeCount = likeCount;
    }

    @PrePersist
    void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
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

    public long getLikeCount() {
        return likeCount;
    }
}
