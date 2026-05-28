package com.vibely.backend.antibot.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "anti_bot_behavior_samples")
public class AntiBotBehaviorSampleEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "session_id", nullable = false, length = 64)
    private String sessionId;

    @Column(name = "device_hash", length = 128)
    private String deviceHash;

    @Column(name = "entropy_score", nullable = false)
    private double entropyScore;

    @Column(name = "linear_ratio", nullable = false)
    private double linearRatio;

    @Column(name = "avg_speed", nullable = false)
    private double avgSpeed;

    @Column(name = "sample_count", nullable = false)
    private int sampleCount;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }

    public void setDeviceHash(String deviceHash) {
        this.deviceHash = deviceHash;
    }

    public void setEntropyScore(double entropyScore) {
        this.entropyScore = entropyScore;
    }

    public void setLinearRatio(double linearRatio) {
        this.linearRatio = linearRatio;
    }

    public void setAvgSpeed(double avgSpeed) {
        this.avgSpeed = avgSpeed;
    }

    public void setSampleCount(int sampleCount) {
        this.sampleCount = sampleCount;
    }
}
