package com.vibely.backend.antibot.dto;

public record FingerprintRegisterResponse(
    String deviceHash,
    int deviceTrustScore,
    boolean automationDetected
) {
}
