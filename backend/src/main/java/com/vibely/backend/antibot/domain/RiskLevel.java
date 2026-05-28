package com.vibely.backend.antibot.domain;

public enum RiskLevel {
    LOW,
    MEDIUM,
    HIGH,
    VERY_HIGH,
    EXTREME;

    public static RiskLevel fromScore(int score) {
        if (score >= 90) {
            return EXTREME;
        }
        if (score >= 75) {
            return VERY_HIGH;
        }
        if (score >= 50) {
            return HIGH;
        }
        if (score >= 25) {
            return MEDIUM;
        }
        return LOW;
    }
}
