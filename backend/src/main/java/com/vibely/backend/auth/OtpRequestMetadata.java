package com.vibely.backend.auth;

public record OtpRequestMetadata(
    String browser,
    String approximateLocation,
    String ipAddress
) {
    public static OtpRequestMetadata unknown() {
        return new OtpRequestMetadata("Trình duyệt", "Không xác định", "Không xác định");
    }
}
