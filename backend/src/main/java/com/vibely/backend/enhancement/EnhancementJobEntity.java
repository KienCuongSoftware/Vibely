package com.vibely.backend.enhancement;

import com.vibely.backend.video.Video;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "enhancement_jobs")
public class EnhancementJobEntity {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "video_id", nullable = false)
    private Video video;

    @Column(name = "target_profile", nullable = false, length = 64)
    private String targetProfile;

    @Column(name = "enhancement_level", nullable = false, length = 32)
    private String enhancementLevel = "MEDIUM";

    @Column(name = "trigger_reason", nullable = false, length = 64)
    private String triggerReason;

    @Column(name = "rule_id")
    private Long ruleId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private EnhancementJobState state;

    @Column(nullable = false)
    private int attempts;

    @Column(name = "max_attempts", nullable = false)
    private int maxAttempts = 5;

    @Column(name = "progress_pct", nullable = false)
    private int progressPct;

    @Column(name = "progress_stage", length = 64)
    private String progressStage;

    @Column(name = "progress_detail", columnDefinition = "TEXT")
    private String progressDetail;

    @Column(name = "lease_owner", length = 120)
    private String leaseOwner;

    @Column(name = "lease_until")
    private Instant leaseUntil;

    @Column(name = "input_s3_key", columnDefinition = "TEXT")
    private String inputS3Key;

    @Column(name = "staging_prefix", columnDefinition = "TEXT")
    private String stagingPrefix;

    @Column(name = "output_version_id")
    private Long outputVersionId;

    @Column(name = "model_name", length = 120)
    private String modelName;

    @Column(name = "model_version", length = 120)
    private String modelVersion;

    @Column(name = "checkpoint_json", columnDefinition = "TEXT")
    private String checkpointJson;

    @Column(name = "last_error", columnDefinition = "TEXT")
    private String lastError;

    @Column(name = "error_code", length = 64)
    private String errorCode;

    @Column(name = "idempotency_key", nullable = false, length = 200, unique = true)
    private String idempotencyKey;

    @Column(name = "queued_at")
    private Instant queuedAt;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "finished_at")
    private Instant finishedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public Video getVideo() {
        return video;
    }

    public void setVideo(Video video) {
        this.video = video;
    }

    public String getTargetProfile() {
        return targetProfile;
    }

    public void setTargetProfile(String targetProfile) {
        this.targetProfile = targetProfile;
    }

    public String getEnhancementLevel() {
        return enhancementLevel;
    }

    public void setEnhancementLevel(String enhancementLevel) {
        this.enhancementLevel = enhancementLevel;
    }

    public String getTriggerReason() {
        return triggerReason;
    }

    public void setTriggerReason(String triggerReason) {
        this.triggerReason = triggerReason;
    }

    public Long getRuleId() {
        return ruleId;
    }

    public void setRuleId(Long ruleId) {
        this.ruleId = ruleId;
    }

    public EnhancementJobState getState() {
        return state;
    }

    public void setState(EnhancementJobState state) {
        this.state = state;
    }

    public int getAttempts() {
        return attempts;
    }

    public void setAttempts(int attempts) {
        this.attempts = attempts;
    }

    public int getMaxAttempts() {
        return maxAttempts;
    }

    public void setMaxAttempts(int maxAttempts) {
        this.maxAttempts = maxAttempts;
    }

    public int getProgressPct() {
        return progressPct;
    }

    public void setProgressPct(int progressPct) {
        this.progressPct = progressPct;
    }

    public String getProgressStage() {
        return progressStage;
    }

    public void setProgressStage(String progressStage) {
        this.progressStage = progressStage;
    }

    public String getProgressDetail() {
        return progressDetail;
    }

    public void setProgressDetail(String progressDetail) {
        this.progressDetail = progressDetail;
    }

    public String getLeaseOwner() {
        return leaseOwner;
    }

    public void setLeaseOwner(String leaseOwner) {
        this.leaseOwner = leaseOwner;
    }

    public Instant getLeaseUntil() {
        return leaseUntil;
    }

    public void setLeaseUntil(Instant leaseUntil) {
        this.leaseUntil = leaseUntil;
    }

    public String getInputS3Key() {
        return inputS3Key;
    }

    public void setInputS3Key(String inputS3Key) {
        this.inputS3Key = inputS3Key;
    }

    public String getStagingPrefix() {
        return stagingPrefix;
    }

    public void setStagingPrefix(String stagingPrefix) {
        this.stagingPrefix = stagingPrefix;
    }

    public Long getOutputVersionId() {
        return outputVersionId;
    }

    public void setOutputVersionId(Long outputVersionId) {
        this.outputVersionId = outputVersionId;
    }

    public String getModelName() {
        return modelName;
    }

    public void setModelName(String modelName) {
        this.modelName = modelName;
    }

    public String getModelVersion() {
        return modelVersion;
    }

    public void setModelVersion(String modelVersion) {
        this.modelVersion = modelVersion;
    }

    public String getCheckpointJson() {
        return checkpointJson;
    }

    public void setCheckpointJson(String checkpointJson) {
        this.checkpointJson = checkpointJson;
    }

    public String getLastError() {
        return lastError;
    }

    public void setLastError(String lastError) {
        this.lastError = lastError;
    }

    public String getErrorCode() {
        return errorCode;
    }

    public void setErrorCode(String errorCode) {
        this.errorCode = errorCode;
    }

    public String getIdempotencyKey() {
        return idempotencyKey;
    }

    public void setIdempotencyKey(String idempotencyKey) {
        this.idempotencyKey = idempotencyKey;
    }

    public Instant getQueuedAt() {
        return queuedAt;
    }

    public void setQueuedAt(Instant queuedAt) {
        this.queuedAt = queuedAt;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(Instant startedAt) {
        this.startedAt = startedAt;
    }

    public Instant getFinishedAt() {
        return finishedAt;
    }

    public void setFinishedAt(Instant finishedAt) {
        this.finishedAt = finishedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
