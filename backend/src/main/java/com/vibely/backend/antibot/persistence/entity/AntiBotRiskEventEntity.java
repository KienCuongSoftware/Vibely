package com.vibely.backend.antibot.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "anti_bot_risk_events")
public class AntiBotRiskEventEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "session_id", length = 64)
    private String sessionId;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "device_hash", length = 128)
    private String deviceHash;

    @Column(name = "ip_hash", length = 128)
    private String ipHash;

    @Column(nullable = false, length = 64)
    private String action;

    @Column(name = "risk_score", nullable = false)
    private int riskScore;

    @Column(name = "risk_level", nullable = false, length = 32)
    private String riskLevel;

    @Column(name = "challenge_level", nullable = false, length = 32)
    private String challengeLevel;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "signals_json", columnDefinition = "jsonb")
    private String signalsJson;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public void setDeviceHash(String deviceHash) {
        this.deviceHash = deviceHash;
    }

    public void setIpHash(String ipHash) {
        this.ipHash = ipHash;
    }

    public void setAction(String action) {
        this.action = action;
    }

    public void setRiskScore(int riskScore) {
        this.riskScore = riskScore;
    }

    public void setRiskLevel(String riskLevel) {
        this.riskLevel = riskLevel;
    }

    public void setChallengeLevel(String challengeLevel) {
        this.challengeLevel = challengeLevel;
    }

    public void setSignalsJson(String signalsJson) {
        this.signalsJson = signalsJson;
    }
}
