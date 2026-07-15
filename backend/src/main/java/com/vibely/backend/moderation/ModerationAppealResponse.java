package com.vibely.backend.moderation;

public record ModerationAppealResponse(
    long id,
    String videoPublicId,
    String fromDecision,
    String appealText,
    String appealState,
    String resolvedDecision,
    String resolverNotes,
    String createdAt,
    String resolvedAt
) {
}
