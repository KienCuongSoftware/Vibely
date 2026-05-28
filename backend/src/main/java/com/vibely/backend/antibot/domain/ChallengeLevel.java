package com.vibely.backend.antibot.domain;

public enum ChallengeLevel {
    NONE,
    CHECKBOX,
    ROTATE,
    SLIDER,
    MULTI_STEP;

    public static ChallengeLevel fromRiskLevel(RiskLevel riskLevel) {
        return switch (riskLevel) {
            case LOW -> NONE;
            case MEDIUM -> CHECKBOX;
            case HIGH -> ROTATE;
            case VERY_HIGH -> SLIDER;
            case EXTREME -> MULTI_STEP;
        };
    }
}
