package com.vibely.backend.antibot.security;

public interface VerificationTokenStore {

    /**
     * Validates signature/expiry/purpose without consuming (e.g. OTP send before register).
     */
    boolean validateUnused(String token, String expectedPurpose);

    /**
     * Validates signature/expiry/purpose and atomically consumes token (replay-safe).
     */
    boolean consume(String token, String expectedPurpose);
}
