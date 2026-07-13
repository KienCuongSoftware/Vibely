package com.vibely.backend.originality;

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
@Table(name = "originality_reports")
public class OriginalityReportEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "video_id", nullable = false, unique = true)
    private Video video;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id")
    private OriginalityJobEntity job;

    @Column(name = "policy_version", nullable = false, length = 32)
    private String policyVersion = "v1";

    @Column(name = "originality_score", nullable = false)
    private double originalityScore;

    @Column(name = "visual_similarity", nullable = false)
    private double visualSimilarity;

    @Column(name = "audio_similarity", nullable = false)
    private double audioSimilarity;

    @Column(name = "ocr_similarity", nullable = false)
    private double ocrSimilarity;

    @Column(name = "watermark_score", nullable = false)
    private double watermarkScore;

    @Column(name = "metadata_score", nullable = false)
    private double metadataScore;

    @Column(name = "scene_object_score", nullable = false)
    private double sceneObjectScore;

    @Column(name = "overall_confidence", nullable = false)
    private double overallConfidence;

    @Enumerated(EnumType.STRING)
    @Column(name = "risk_level", nullable = false, length = 16)
    private OriginalityRiskLevel riskLevel;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private OriginalityDecision decision;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "matched_video_id")
    private Video matchedVideo;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "explain_json", nullable = false, columnDefinition = "jsonb")
    private String explainJson = "{}";

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "model_versions", nullable = false, columnDefinition = "jsonb")
    private String modelVersions = "{}";

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

    public OriginalityJobEntity getJob() {
        return job;
    }

    public void setJob(OriginalityJobEntity job) {
        this.job = job;
    }

    public String getPolicyVersion() {
        return policyVersion;
    }

    public void setPolicyVersion(String policyVersion) {
        this.policyVersion = policyVersion;
    }

    public double getOriginalityScore() {
        return originalityScore;
    }

    public void setOriginalityScore(double originalityScore) {
        this.originalityScore = originalityScore;
    }

    public double getVisualSimilarity() {
        return visualSimilarity;
    }

    public void setVisualSimilarity(double visualSimilarity) {
        this.visualSimilarity = visualSimilarity;
    }

    public double getAudioSimilarity() {
        return audioSimilarity;
    }

    public void setAudioSimilarity(double audioSimilarity) {
        this.audioSimilarity = audioSimilarity;
    }

    public double getOcrSimilarity() {
        return ocrSimilarity;
    }

    public void setOcrSimilarity(double ocrSimilarity) {
        this.ocrSimilarity = ocrSimilarity;
    }

    public double getWatermarkScore() {
        return watermarkScore;
    }

    public void setWatermarkScore(double watermarkScore) {
        this.watermarkScore = watermarkScore;
    }

    public double getMetadataScore() {
        return metadataScore;
    }

    public void setMetadataScore(double metadataScore) {
        this.metadataScore = metadataScore;
    }

    public double getSceneObjectScore() {
        return sceneObjectScore;
    }

    public void setSceneObjectScore(double sceneObjectScore) {
        this.sceneObjectScore = sceneObjectScore;
    }

    public double getOverallConfidence() {
        return overallConfidence;
    }

    public void setOverallConfidence(double overallConfidence) {
        this.overallConfidence = overallConfidence;
    }

    public OriginalityRiskLevel getRiskLevel() {
        return riskLevel;
    }

    public void setRiskLevel(OriginalityRiskLevel riskLevel) {
        this.riskLevel = riskLevel;
    }

    public OriginalityDecision getDecision() {
        return decision;
    }

    public void setDecision(OriginalityDecision decision) {
        this.decision = decision;
    }

    public Video getMatchedVideo() {
        return matchedVideo;
    }

    public void setMatchedVideo(Video matchedVideo) {
        this.matchedVideo = matchedVideo;
    }

    public String getExplainJson() {
        return explainJson;
    }

    public void setExplainJson(String explainJson) {
        this.explainJson = explainJson == null || explainJson.isBlank() ? "{}" : explainJson;
    }

    public String getModelVersions() {
        return modelVersions;
    }

    public void setModelVersions(String modelVersions) {
        this.modelVersions = modelVersions == null || modelVersions.isBlank() ? "{}" : modelVersions;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
