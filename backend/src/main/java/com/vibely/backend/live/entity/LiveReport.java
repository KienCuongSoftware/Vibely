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
import java.time.LocalDateTime;

@Entity
@Table(name = "live_reports")
public class LiveReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "live_id", nullable = false, updatable = false)
    private Long liveId;

    @Column(name = "comment_id", updatable = false)
    private Long commentId;

    @Column(name = "reporter_id", nullable = false, updatable = false)
    private Long reporterId;

    @Column(nullable = false, length = 64, updatable = false)
    private String reason;

    @Column(length = 500, updatable = false)
    private String details;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private LiveReportStatus status = LiveReportStatus.OPEN;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected LiveReport() {}

    public LiveReport(Long liveId, Long commentId, Long reporterId, String reason, String details) {
        this.liveId = liveId;
        this.commentId = commentId;
        this.reporterId = reporterId;
        this.reason = reason;
        this.details = details;
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

    public Long getLiveId() {
        return liveId;
    }

    public Long getCommentId() {
        return commentId;
    }

    public Long getReporterId() {
        return reporterId;
    }

    public String getReason() {
        return reason;
    }

    public String getDetails() {
        return details;
    }

    public LiveReportStatus getStatus() {
        return status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
