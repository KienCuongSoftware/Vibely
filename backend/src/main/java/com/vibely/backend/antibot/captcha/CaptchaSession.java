package com.vibely.backend.antibot.captcha;

import com.vibely.backend.antibot.domain.CaptchaType;
import java.time.Instant;

public record CaptchaSession(
    String challengeId,
    CaptchaType type,
    int correctAngle,
    int displayRotation,
    String imageBase64,
    String puzzleBase64,
    Integer sliderTargetX,
    String deviceHash,
    String ipHash,
    Instant createdAt,
    Instant expiresAt,
    boolean consumed,
    int attempts,
    boolean multiStep
) {
}
