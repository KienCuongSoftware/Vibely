package com.vibely.backend.live.entity;

import com.vibely.backend.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;

@Entity
@Table(name = "live_moderators", uniqueConstraints = {
    @UniqueConstraint(name = "uk_live_moderators_pair", columnNames = {"host_id", "moderator_id"})
})
public class LiveModerator {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "host_id", nullable = false, updatable = false)
    private Long hostId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "moderator_id", nullable = false, updatable = false)
    private User moderator;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected LiveModerator() {}

    public LiveModerator(Long hostId, User moderator) {
        this.hostId = hostId;
        this.moderator = moderator;
    }

    @PrePersist
    void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    public Long getId() {
        return id;
    }

    public Long getHostId() {
        return hostId;
    }

    public User getModerator() {
        return moderator;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
