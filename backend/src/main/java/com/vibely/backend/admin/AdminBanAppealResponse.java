package com.vibely.backend.admin;

import java.time.LocalDateTime;

public record AdminBanAppealResponse(
    Long id,
    String contactEmail,
    String description,
    String banReason,
    String maskedAccountEmail,
    Long userId,
    String username,
    String displayName,
    String status,
    String adminNotes,
    Long reviewedByAdminId,
    LocalDateTime reviewedAt,
    LocalDateTime createdAt
) {
}
