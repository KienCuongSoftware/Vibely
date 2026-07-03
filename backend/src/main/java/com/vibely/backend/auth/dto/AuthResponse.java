package com.vibely.backend.auth.dto;

public record AuthResponse(
    String accessToken,
    String refreshToken,
    Long userId,
    String username,
    String displayName,
    String email,
    String role,
    String avatarUrl,
    boolean needsOnboarding
) {
}
