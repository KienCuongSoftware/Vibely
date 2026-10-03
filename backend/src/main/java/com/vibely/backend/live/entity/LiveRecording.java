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
 * Recording of one LIVE. The media lives on disk (DVR files) and then in S3 as a regular video;
 * this row only tracks state. Transitions are conditional updates in the repository.
 */
@Entity
@Table(
    name = "live_recordings",
    uniqueConstraints = @UniqueConstraint(name = "uk_live_recordings_live", columnNames = "live_id")
)
public class LiveRecording {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "live_id", nullable = false, updatable = false)
    private Long liveId;

    @Column(name = "host_id", nullable = false, updatable = false)
    private Long hostId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private LiveRecordingStatus status = LiveRecordingStatus.RECORDING;

    @Column(name = "video_id")
    private Long videoId;

    @Column(name = "storage_key", length = 512)
    private String storageKey;

    @Column(name = "duration_seconds")
    private Integer durationSeconds;

    @Column(name = "size_bytes")
    private Long sizeBytes;

    @Column(nullable = false)
    private int attempts;

    @Column(name = "failure_reason", length = 64)
    private String failureReason;

    @Column(name = "started_at", nullable = false, updatable = false)
    private LocalDateTime startedAt;

    @Column(name = "live_ended_at")
    private LocalDateTime liveEndedAt;

    @Column(name = "processing_started_at")
    private LocalDateTime processingStartedAt;

    @Column(name = "ready_at")
    private LocalDateTime readyAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected LiveRecording() {}

    public LiveRecording(Long liveId, Long hostId, LocalDateTime startedAt) {
        this.liveId = liveId;
        this.hostId = hostId;
        this.startedAt = startedAt;
        this.createdAt = startedAt;
        this.updatedAt = startedAt;
    }

    public Long getId() {
        return id;
    }

    public Long getLiveId() {
        return liveId;
    }

    public Long getHostId() {
        return hostId;
    }

    public LiveRecordingStatus getStatus() {
        return status;
    }

    public Long getVideoId() {
        return videoId;
    }

    public String getStorageKey() {
        return storageKey;
    }

    public Integer getDurationSeconds() {
        return durationSeconds;
    }

    public Long getSizeBytes() {
        return sizeBytes;
    }

    public int getAttempts() {
        return attempts;
    }

    public String getFailureReason() {
        return failureReason;
    }

    public LocalDateTime getStartedAt() {
        return startedAt;
    }

    public LocalDateTime getLiveEndedAt() {
        return liveEndedAt;
    }

    public LocalDateTime getProcessingStartedAt() {
        return processingStartedAt;
    }

    public LocalDateTime getReadyAt() {
        return readyAt;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
