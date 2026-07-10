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
    String accountStatus,
    String banReason,
    LocalDateTime bannedAt,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
}
