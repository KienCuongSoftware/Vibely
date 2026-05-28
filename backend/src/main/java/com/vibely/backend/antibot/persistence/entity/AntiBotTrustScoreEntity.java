package com.vibely.backend.antibot.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "anti_bot_trust_scores")
public class AntiBotTrustScoreEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "subject_type", nullable = false, length = 32)
    private String subjectType;

    @Column(name = "subject_key", nullable = false, length = 128)
    private String subjectKey;

    @Column(name = "trust_score", nullable = false)
    private int trustScore = 50;

    @Column(name = "successful_captcha_count", nullable = false)
    private int successfulCaptchaCount;

    @Column(name = "failed_captcha_count", nullable = false)
    private int failedCaptchaCount;

    @Column(name = "abuse_signal_count", nullable = false)
    private int abuseSignalCount;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public Long getId() {
        return id;
    }

    public String getSubjectType() {
        return subjectType;
    }

    public void setSubjectType(String subjectType) {
        this.subjectType = subjectType;
    }

    public String getSubjectKey() {
        return subjectKey;
    }

    public void setSubjectKey(String subjectKey) {
        this.subjectKey = subjectKey;
    }

    public int getTrustScore() {
        return trustScore;
    }

    public void setTrustScore(int trustScore) {
        this.trustScore = trustScore;
    }

    public int getSuccessfulCaptchaCount() {
        return successfulCaptchaCount;
    }

    public void setSuccessfulCaptchaCount(int successfulCaptchaCount) {
        this.successfulCaptchaCount = successfulCaptchaCount;
    }

    public int getFailedCaptchaCount() {
        return failedCaptchaCount;
    }

    public void setFailedCaptchaCount(int failedCaptchaCount) {
        this.failedCaptchaCount = failedCaptchaCount;
    }

    public int getAbuseSignalCount() {
        return abuseSignalCount;
    }

    public void setAbuseSignalCount(int abuseSignalCount) {
        this.abuseSignalCount = abuseSignalCount;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
