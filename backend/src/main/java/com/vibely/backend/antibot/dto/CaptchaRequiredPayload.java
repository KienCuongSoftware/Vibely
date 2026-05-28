package com.vibely.backend.antibot.dto;

import com.vibely.backend.antibot.domain.ChallengeLevel;

public record CaptchaRequiredPayload(
    ChallengeLevel challengeLevel,
    int riskScore
) {
}
