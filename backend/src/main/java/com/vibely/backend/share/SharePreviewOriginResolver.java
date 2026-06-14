package com.vibely.backend.share;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Locale;

/** Chọn origin cho OG meta và redirect — ưu tiên URL cấu hình; dev tunnel dùng Host thật. */
final class SharePreviewOriginResolver {

    private SharePreviewOriginResolver() {}

    static String resolve(String configuredFrontendBaseUrl, HttpServletRequest request) {
        String configured = normalizeOrigin(configuredFrontendBaseUrl);
        if (!isLocalOrigin(configured)) {
            return configured;
        }
        String requestOrigin = normalizeOrigin(SharePreviewHtmlRenderer.requestOrigin(request));
        if (isPublicOrigin(requestOrigin)) {
            return requestOrigin;
        }
        return configured;
    }

    static boolean isLocalOrigin(String origin) {
        if (origin == null || origin.isBlank()) {
            return true;
        }
        String lower = origin.toLowerCase(Locale.ROOT);
        return lower.contains("localhost")
            || lower.contains("127.0.0.1")
            || lower.contains("[::1]");
    }

    static boolean isPublicOrigin(String origin) {
        if (origin == null || origin.isBlank()) {
            return false;
        }
        if (isLocalOrigin(origin)) {
            return false;
        }
        return origin.startsWith("http://") || origin.startsWith("https://");
    }

    private static String normalizeOrigin(String raw) {
        if (raw == null || raw.isBlank()) {
            return "";
        }
        return raw.trim().replaceAll("/+$", "");
    }
}
