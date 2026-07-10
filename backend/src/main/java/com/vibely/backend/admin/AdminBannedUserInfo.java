package com.vibely.backend.admin;

import java.time.LocalDateTime;

public record AdminBannedUserInfo(
    Long id,
    String username,
    String displayName,
    String email,
    String banReason,
    LocalDateTime bannedAt
) {
}
