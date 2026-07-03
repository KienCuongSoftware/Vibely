package com.vibely.backend.auth.dto;

public record AccountDeactivatedPayload(String reactivationToken, String maskedEmail) {
}
