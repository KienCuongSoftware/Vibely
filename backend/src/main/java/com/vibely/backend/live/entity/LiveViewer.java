package com.vibely.backend.live.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

/** Analytics record of one finished viewing session; not used for realtime counting. */
@Entity
@Table(name = "live_viewers")
public class LiveViewer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "live_id", nullable = false, updatable = false)
    private Long liveId;

    @Column(name = "user_id", updatable = false)
    private Long userId;

    @Column(name = "session_id", nullable = false, length = 64, updatable = false)
    private String sessionId;

    @Column(name = "joined_at", nullable = false, updatable = false)
    private LocalDateTime joinedAt;

    @Column(name = "left_at")
    private LocalDateTime leftAt;

    @Column(name = "watch_duration_seconds", nullable = false)
    private long watchDurationSeconds;

    protected LiveViewer() {}

    public LiveViewer(
        Long liveId,
        Long userId,
        String sessionId,
        LocalDateTime joinedAt,
        LocalDateTime leftAt,
        long watchDurationSeconds
    ) {
        this.liveId = liveId;
        this.userId = userId;
        this.sessionId = sessionId;
        this.joinedAt = joinedAt;
        this.leftAt = leftAt;
        this.watchDurationSeconds = Math.max(0, watchDurationSeconds);
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

    public String getSessionId() {
        return sessionId;
    }

    public LocalDateTime getJoinedAt() {
        return joinedAt;
    }

    public LocalDateTime getLeftAt() {
        return leftAt;
    }

    public long getWatchDurationSeconds() {
        return watchDurationSeconds;
    }
}
