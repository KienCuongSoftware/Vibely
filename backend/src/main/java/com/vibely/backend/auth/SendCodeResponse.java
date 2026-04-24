package com.vibely.backend.auth;

public record SendCodeResponse(
    int resendAfterSeconds,
    int expiresInSeconds,
    String demoCode
) {
}
