package com.vibely.backend.auth.dto;

public record SendCodeResponse(
    int resendAfterSeconds,
    int expiresInSeconds,
    boolean emailSent,
    String demoCode
) {
}
