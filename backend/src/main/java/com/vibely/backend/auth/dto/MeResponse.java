package com.vibely.backend.auth.dto;

public record MeResponse(
    Long id,
    String username,
    String displayName,
    String email,
    String bio,
    String avatarUrl,
    String role,
    boolean needsOnboarding,
    boolean privateAccount,
    String accountRegion,
    String commentAudience,
    String dmPotentialAudience,
    String dmOthersAudience
) {
}
