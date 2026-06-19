package com.vibely.backend.admin;

import java.time.LocalDateTime;

public record AdminUserResponse(
    Long id,
    String username,
    String displayName,
    String email,
    String role,
    String avatarUrl,
    boolean onboardingCompleted,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
}
