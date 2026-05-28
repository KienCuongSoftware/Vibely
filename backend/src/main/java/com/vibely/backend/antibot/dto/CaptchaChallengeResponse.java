package com.vibely.backend.antibot.dto;

import com.vibely.backend.antibot.domain.CaptchaType;

public record CaptchaChallengeResponse(
    String challengeId,
    CaptchaType type,
    String imageBase64,
    String puzzleBase64,
    int displayRotation,
    int sliderMax,
    long expiresAtEpochMs,
    String signedToken,
    boolean multiStep
) {
}
