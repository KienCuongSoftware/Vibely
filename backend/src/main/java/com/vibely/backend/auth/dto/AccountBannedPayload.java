package com.vibely.backend.auth.dto;

public record AccountBannedPayload(
    String maskedEmail,
    String reason
) {
}
