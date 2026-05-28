package com.vibely.backend.antibot.dto;

public record TrustEvaluateRequest(
    Long userId,
    String deviceHash,
    String sessionId
) {
}
