package com.vibely.backend.auth;

public record AccountDeactivatedPayload(String reactivationToken, String maskedEmail) {
}
