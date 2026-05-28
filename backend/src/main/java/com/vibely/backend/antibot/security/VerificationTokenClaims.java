package com.vibely.backend.antibot.security;

public record VerificationTokenClaims(
    String purpose,
    String challengeId,
    long expiresAtEpochMs
) {
}
