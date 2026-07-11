package com.vibely.backend.auth.dto;

public record AccountBannedPayload(
    String email,
    String maskedEmail,
    String reason
) {
}
