package com.vibely.backend.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "otp_challenges")
public class OtpChallenge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String email;

    @Column(name = "challenge_type", nullable = false, length = 40)
    private String challengeType;

    @Column(name = "challenge_payload")
    private String challengePayload;

    @Column(name = "challenge_response")
    private String challengeResponse;

    @Column(nullable = false)
    private boolean passed;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getChallengeType() {
        return challengeType;
    }

    public void setChallengeType(String challengeType) {
        this.challengeType = challengeType;
    }

    public String getChallengePayload() {
        return challengePayload;
    }

    public void setChallengePayload(String challengePayload) {
        this.challengePayload = challengePayload;
    }

    public String getChallengeResponse() {
        return challengeResponse;
    }

    public void setChallengeResponse(String challengeResponse) {
        this.challengeResponse = challengeResponse;
    }

    public boolean isPassed() {
        return passed;
    }

    public void setPassed(boolean passed) {
        this.passed = passed;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
