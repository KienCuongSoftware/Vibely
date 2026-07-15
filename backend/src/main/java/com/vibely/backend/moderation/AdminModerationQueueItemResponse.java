package com.vibely.backend.moderation;

public record AdminModerationQueueItemResponse(
    long queueId,
    long videoId,
    String videoPublicId,
    String title,
    String thumbnailUrl,
    String authorUsername,
    long reportId,
    String aiDecision,
    int risk,
    double confidence,
    String queueState,
    int priority,
    String reason,
    String claimedBy,
    String createdAt,
    boolean reportShadow
) {
}
