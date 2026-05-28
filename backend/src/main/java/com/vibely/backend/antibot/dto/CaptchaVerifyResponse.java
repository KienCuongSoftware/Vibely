package com.vibely.backend.antibot.dto;

public record CaptchaVerifyResponse(
    boolean verified,
    String verificationToken,
    long expiresAtEpochMs,
    double behaviorConfidence
) {
}
