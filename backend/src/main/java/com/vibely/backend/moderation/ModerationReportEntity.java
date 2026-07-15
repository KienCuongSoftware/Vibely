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
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "moderation_reports")
public class ModerationReportEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "job_id", nullable = false, unique = true)
    private ModerationJobEntity job;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "video_id", nullable = false)
    private Video video;

    @Column(name = "policy_version", nullable = false, length = 64)
    private String policyVersion;

    @Column(nullable = false)
    private int risk;

    @Column(nullable = false)
    private double confidence;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private ModerationDecision decision;

    @Column(nullable = false, length = 16)
    private String status = "OPEN";

    @Column(name = "override_applied", nullable = false)
    private boolean overrideApplied;

    @Column(name = "originality_pending", nullable = false)
    private boolean originalityPending;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "explain_json", nullable = false, columnDefinition = "jsonb")
    private String explainJson = "{}";

    @Column(name = "engine_version", nullable = false, length = 64)
    private String engineVersion;

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

    public ModerationJobEntity getJob() {
        return job;
    }

    public void setJob(ModerationJobEntity job) {
        this.job = job;
    }

    public Video getVideo() {
        return video;
    }

    public void setVideo(Video video) {
        this.video = video;
    }

    public String getPolicyVersion() {
        return policyVersion;
    }

    public void setPolicyVersion(String policyVersion) {
        this.policyVersion = policyVersion;
    }

    public int getRisk() {
        return risk;
    }

    public void setRisk(int risk) {
        this.risk = risk;
    }

    public double getConfidence() {
        return confidence;
    }

    public void setConfidence(double confidence) {
        this.confidence = confidence;
    }

    public ModerationDecision getDecision() {
        return decision;
    }

    public void setDecision(ModerationDecision decision) {
        this.decision = decision;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public boolean isOverrideApplied() {
        return overrideApplied;
    }

    public void setOverrideApplied(boolean overrideApplied) {
        this.overrideApplied = overrideApplied;
    }

    public boolean isOriginalityPending() {
        return originalityPending;
    }

    public void setOriginalityPending(boolean originalityPending) {
        this.originalityPending = originalityPending;
    }

    public String getExplainJson() {
        return explainJson;
    }

    public void setExplainJson(String explainJson) {
        this.explainJson = explainJson == null ? "{}" : explainJson;
    }

    public String getEngineVersion() {
        return engineVersion;
    }

    public void setEngineVersion(String engineVersion) {
        this.engineVersion = engineVersion;
    }
}
