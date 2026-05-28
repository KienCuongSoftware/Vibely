package com.vibely.backend.antibot.dto;

public record BehaviorSamplePayload(
    long timestampMs,
    double x,
    double y,
    String eventType
) {
}
