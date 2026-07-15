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

@Entity
@Table(name = "moderation_decisions")
public class ModerationDecisionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "video_id", nullable = false, unique = true)
    private Video video;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "report_id")
    private ModerationReportEntity report;

    @Enumerated(EnumType.STRING)
    @Column(name = "effective_decision", nullable = false, length = 16)
    private ModerationDecision effectiveDecision;

    @Column(name = "explore_eligible", nullable = false)
    private boolean exploreEligible = true;

    @Column(name = "review_required", nullable = false)
    private boolean reviewRequired;

    @Column(name = "status_applied", length = 32)
    private String statusApplied;

    @Column(name = "applied_at", nullable = false)
    private LocalDateTime appliedAt;

    @Column(name = "applied_by", nullable = false, length = 64)
    private String appliedBy = "SYSTEM";

    @Column(nullable = false)
    private boolean shadow;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        if (appliedAt == null) {
            appliedAt = now;
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

    public ModerationReportEntity getReport() {
        return report;
    }

    public void setReport(ModerationReportEntity report) {
        this.report = report;
    }

    public ModerationDecision getEffectiveDecision() {
        return effectiveDecision;
    }

    public void setEffectiveDecision(ModerationDecision effectiveDecision) {
        this.effectiveDecision = effectiveDecision;
    }

    public boolean isExploreEligible() {
        return exploreEligible;
    }

    public void setExploreEligible(boolean exploreEligible) {
        this.exploreEligible = exploreEligible;
    }

    public boolean isReviewRequired() {
        return reviewRequired;
    }

    public void setReviewRequired(boolean reviewRequired) {
        this.reviewRequired = reviewRequired;
    }

    public String getStatusApplied() {
        return statusApplied;
    }

    public void setStatusApplied(String statusApplied) {
        this.statusApplied = statusApplied;
    }

    public void setAppliedAt(LocalDateTime appliedAt) {
        this.appliedAt = appliedAt;
    }

    public String getAppliedBy() {
        return appliedBy;
    }

    public void setAppliedBy(String appliedBy) {
        this.appliedBy = appliedBy;
    }

    public boolean isShadow() {
        return shadow;
    }

    public void setShadow(boolean shadow) {
        this.shadow = shadow;
    }
}
