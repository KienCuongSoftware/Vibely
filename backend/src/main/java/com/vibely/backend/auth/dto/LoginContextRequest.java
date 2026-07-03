package com.vibely.backend.auth.dto;

import com.vibely.backend.antibot.dto.DeviceFingerprintPayload;

public class LoginContextRequest {

    private Double latitude;
    private Double longitude;
    private DeviceFingerprintPayload fingerprint;
    private String fingerprintHash;

    public Double getLatitude() {
        return latitude;
    }

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }

    public DeviceFingerprintPayload getFingerprint() {
        return fingerprint;
    }

    public void setFingerprint(DeviceFingerprintPayload fingerprint) {
        this.fingerprint = fingerprint;
    }

    public String getFingerprintHash() {
        return fingerprintHash;
    }

    public void setFingerprintHash(String fingerprintHash) {
        this.fingerprintHash = fingerprintHash;
    }
}
