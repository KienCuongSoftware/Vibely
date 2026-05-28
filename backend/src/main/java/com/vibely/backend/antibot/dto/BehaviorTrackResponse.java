package com.vibely.backend.antibot.dto;

public record BehaviorTrackResponse(
    double entropyScore,
    double linearRatio,
    double behaviorConfidence,
    boolean suspicious
) {
}
