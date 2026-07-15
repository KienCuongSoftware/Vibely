package com.vibely.backend.moderation;

import com.vibely.backend.video.Video;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "moderation_jobs")
public class ModerationJobEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "video_id", nullable = false)
    private Video video;

    @Column(name = "analysis_job_id")
    private UUID analysisJobId;

    @Column(name = "originality_report_id")
    private Long originalityReportId;

    @Column(name = "policy_version", nullable = false, length = 64)
    private String policyVersion;

    @Enumerated(EnumType.STRING)
    @Column(name = "job_state", nullable = false, length = 20)
    private ModerationJobState jobState = ModerationJobState.PENDING;

    @Column(name = "originality_pending", nullable = false)
    private boolean originalityPending;

    @Column(nullable = false)
    private int attempts;

    @Column(name = "claimed_at")
    private LocalDateTime claimedAt;

    @Column(name = "last_error")
    private String lastError;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "snapshot_json", nullable = false, columnDefinition = "jsonb")
    private String snapshotJson = "{}";

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public Video getVideo() {
        return video;
    }

    public void setVideo(Video video) {
        this.video = video;
    }

    public UUID getAnalysisJobId() {
        return analysisJobId;
    }

    public void setAnalysisJobId(UUID analysisJobId) {
        this.analysisJobId = analysisJobId;
    }

    public Long getOriginalityReportId() {
        return originalityReportId;
    }

    public void setOriginalityReportId(Long originalityReportId) {
        this.originalityReportId = originalityReportId;
    }

    public String getPolicyVersion() {
        return policyVersion;
    }

    public void setPolicyVersion(String policyVersion) {
        this.policyVersion = policyVersion;
    }

    public ModerationJobState getJobState() {
        return jobState;
    }

    public void setJobState(ModerationJobState jobState) {
        this.jobState = jobState;
    }

    public boolean isOriginalityPending() {
        return originalityPending;
    }

    public void setOriginalityPending(boolean originalityPending) {
        this.originalityPending = originalityPending;
    }

    public int getAttempts() {
        return attempts;
    }

    public void setAttempts(int attempts) {
        this.attempts = attempts;
    }

    public LocalDateTime getClaimedAt() {
        return claimedAt;
    }

    public void setClaimedAt(LocalDateTime claimedAt) {
        this.claimedAt = claimedAt;
    }

    public String getLastError() {
        return lastError;
    }

    public void setLastError(String lastError) {
        this.lastError = lastError;
    }

    public String getSnapshotJson() {
        return snapshotJson;
    }

    public void setSnapshotJson(String snapshotJson) {
        this.snapshotJson = snapshotJson == null ? "{}" : snapshotJson;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
