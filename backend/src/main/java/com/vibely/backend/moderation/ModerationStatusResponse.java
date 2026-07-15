package com.vibely.backend.moderation;

public record ModerationStatusResponse(
    String videoPublicId,
    String statusLabel,
    String effectiveDecision,
    boolean exploreEligible,
    boolean reviewRequired,
    boolean appealable,
    boolean hasOpenAppeal,
    String appealState,
    Double trustScore,
    String messageVi
) {
}
