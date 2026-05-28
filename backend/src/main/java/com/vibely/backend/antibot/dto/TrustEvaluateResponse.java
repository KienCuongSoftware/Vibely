package com.vibely.backend.antibot.dto;

public record TrustEvaluateResponse(
    int userTrustScore,
    int deviceTrustScore,
    boolean captchaBypassEligible
) {
}
