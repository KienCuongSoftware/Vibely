package com.vibely.backend.share;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Locale;

public final class ShareClientHints {

    private ShareClientHints() {}

    /**
     * Prefer the address seen by the servlet container after trusted proxy processing
     * ({@code ForwardedHeaderFilter} / {@code server.forward-headers-strategy}).
     * Do not trust client-supplied {@code X-Forwarded-For} directly.
     */
    public static String clientIp(HttpServletRequest request) {
        String remote = request.getRemoteAddr();
        if (remote != null && !remote.isBlank()) {
            return remote.trim();
        }
        return "unknown";
    }

    public static String countryCode(HttpServletRequest request) {
        String cf = header(request, "CF-IPCountry");
        if (cf != null && cf.length() == 2) {
            return cf.toUpperCase(Locale.ROOT);
        }
        return null;
    }

    public static ClientDeviceHints fromUserAgent(String userAgent) {
        if (userAgent == null || userAgent.isBlank()) {
            return new ClientDeviceHints("unknown", "unknown", "unknown", false);
        }
        String ua = userAgent.toLowerCase(Locale.ROOT);
        boolean bot = ua.contains("bot") || ua.contains("spider") || ua.contains("crawl");
        String device = ua.contains("mobile") || ua.contains("android") || ua.contains("iphone")
            ? "mobile"
            : ua.contains("tablet") || ua.contains("ipad")
                ? "tablet"
                : "desktop";
        String browser = ua.contains("edg/") ? "edge"
            : ua.contains("chrome/") && !ua.contains("edg/") ? "chrome"
            : ua.contains("firefox/") ? "firefox"
            : ua.contains("safari/") && !ua.contains("chrome/") ? "safari"
            : "other";
        String os = ua.contains("android") ? "android"
            : ua.contains("iphone") || ua.contains("ipad") || ua.contains("ios") ? "ios"
            : ua.contains("windows") ? "windows"
            : ua.contains("mac os") ? "macos"
            : ua.contains("linux") ? "linux"
            : "other";
        return new ClientDeviceHints(device, browser, os, bot);
    }

    private static String header(HttpServletRequest request, String name) {
        String value = request.getHeader(name);
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
