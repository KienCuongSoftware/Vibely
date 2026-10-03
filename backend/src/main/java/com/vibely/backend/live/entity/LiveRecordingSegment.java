package com.vibely.backend.live.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;

/** One closed DVR file of a recording, in the order SRS reported it. */
@Entity
@Table(
    name = "live_recording_segments",
    uniqueConstraints = @UniqueConstraint(name = "uk_live_recording_segments_path", columnNames = "file_path")
)
public class LiveRecordingSegment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "recording_id", nullable = false, updatable = false)
    private Long recordingId;

    @Column(name = "file_path", nullable = false, length = 1024, updatable = false)
    private String filePath;

    @Column(name = "size_bytes", nullable = false, updatable = false)
    private long sizeBytes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected LiveRecordingSegment() {}

    public LiveRecordingSegment(Long recordingId, String filePath, long sizeBytes, LocalDateTime createdAt) {
        this.recordingId = recordingId;
        this.filePath = filePath;
        this.sizeBytes = sizeBytes;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public Long getRecordingId() {
        return recordingId;
    }

    public String getFilePath() {
        return filePath;
    }

    public long getSizeBytes() {
        return sizeBytes;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
