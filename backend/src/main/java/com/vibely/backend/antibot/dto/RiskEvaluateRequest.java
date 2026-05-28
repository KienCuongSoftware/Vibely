package com.vibely.backend.antibot.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.Map;

public record RiskEvaluateRequest(
    @NotBlank String sessionId,
    String action,
    String deviceHash,
    DeviceFingerprintPayload fingerprint,
    AutomationSignals automation,
    Map<String, Object> context
) {
}
