package com.vibely.backend.antibot.dto;

import jakarta.validation.constraints.NotNull;

public record FingerprintRegisterRequest(
    @NotNull DeviceFingerprintPayload fingerprint,
    AutomationSignals automation,
    String sessionId,
    Long userId
) {
}
