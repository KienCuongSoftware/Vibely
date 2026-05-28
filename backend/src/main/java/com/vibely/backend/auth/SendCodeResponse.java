package com.vibely.backend.auth;

public record SendCodeResponse(
    int resendAfterSeconds,
    int expiresInSeconds,
    boolean emailSent,
    String demoCode
) {
}
