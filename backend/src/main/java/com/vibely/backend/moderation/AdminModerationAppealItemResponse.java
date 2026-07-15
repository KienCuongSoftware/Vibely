package com.vibely.backend.moderation;

public record AdminModerationAppealItemResponse(
    long appealId,
    long videoId,
    String videoPublicId,
    String title,
    String authorUsername,
    String fromDecision,
    String appealText,
    String appealState,
    String createdAt,
    Long queueId
) {
}
