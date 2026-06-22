package com.vibely.backend.auth;

public enum OtpCodePurpose {
    REGISTER,
    PASSWORD_RESET,
    ACCOUNT_DEACTIVATION,
    ACCOUNT_REACTIVATION;

    public static OtpCodePurpose fromRequestValue(String raw) {
        if (raw == null || raw.isBlank()) {
            return REGISTER;
        }
        try {
            return OtpCodePurpose.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new com.vibely.backend.common.BadRequestException("Mục đích mã OTP không hợp lệ");
        }
    }
}
