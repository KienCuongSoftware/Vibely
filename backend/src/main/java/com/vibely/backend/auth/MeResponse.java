package com.vibely.backend.auth;

public record MeResponse(
    Long id,
    String username,
    String displayName,
    String email,
    String bio,
    String avatarUrl
) {
}
