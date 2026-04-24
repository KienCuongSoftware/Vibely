package com.vibely.backend.auth;

public record AuthResponse(
    String accessToken,
    String refreshToken,
    Long userId,
    String username,
    String displayName,
    String email,
    String avatarUrl
) {
}
