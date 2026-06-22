package com.vibely.backend.auth.context;

public record DeviceInfo(
    String browser,
    String operatingSystem,
    String deviceType
) {
    public String displayName() {
        if ("iOS".equals(operatingSystem) && "Mobile".equals(deviceType)) {
            return browser + " trên iPhone";
        }
        if (("iOS".equals(operatingSystem) || "iPadOS".equals(operatingSystem)) && "Tablet".equals(deviceType)) {
            return browser + " trên iPad";
        }
        return browser + " trên " + operatingSystem;
    }
}
