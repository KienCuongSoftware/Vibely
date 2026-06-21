package com.vibely.backend.auth;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.util.StringUtils;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

/** OAuth redirect dựa trên host công khai (tunnel/LAN) hoặc {@code app.oauth2.public-base-url}. */
public final class OAuthRedirectUrlSupport {

    private OAuthRedirectUrlSupport() {}

    /** Origin công khai, ví dụ {@code https://xxx.trycloudflare.com}. */
    public static String resolvePublicOrigin(HttpServletRequest request, String configuredPublicBaseUrl) {
        String requestOrigin = resolveRequestOrigin(request);
        if (isLocalhostOrigin(requestOrigin)) {
            return requestOrigin;
        }
        if (StringUtils.hasText(configuredPublicBaseUrl)) {
            return trimTrailingSlash(configuredPublicBaseUrl.trim());
        }
        return requestOrigin;
    }

    private static String resolveRequestOrigin(HttpServletRequest request) {
        if (request == null) {
            return "";
        }
        try {
            String origin = ServletUriComponentsBuilder.fromRequest(request)
                .replacePath(request.getContextPath())
                .replaceQuery(null)
                .fragment(null)
                .build()
                .toUriString();
            if (StringUtils.hasText(origin)) {
                return trimTrailingSlash(origin);
            }
        } catch (RuntimeException ignored) {
            /* fallback below */
        }
        String proto = headerFirst(request, "X-Forwarded-Proto", request.getScheme());
        String host = headerFirst(request, "X-Forwarded-Host", request.getHeader("Host"));
        if (!StringUtils.hasText(host)) {
            return "";
        }
        return trimTrailingSlash(proto + "://" + host);
    }

    private static boolean isLocalhostOrigin(String origin) {
        if (!StringUtils.hasText(origin)) {
            return false;
        }
        String normalized = origin.toLowerCase();
        return normalized.startsWith("http://localhost:")
            || normalized.startsWith("https://localhost:")
            || normalized.startsWith("http://127.0.0.1:")
            || normalized.startsWith("https://127.0.0.1:");
    }

    /** URL trang /login trên cùng origin với callback OAuth. */
    public static String resolveFrontendLoginUrl(
        HttpServletRequest request,
        String configuredFallback,
        String configuredPublicBaseUrl
    ) {
        String origin = resolvePublicOrigin(request, configuredPublicBaseUrl);
        if (StringUtils.hasText(origin)) {
            return origin + "/login";
        }
        return configuredFallback;
    }

    private static String headerFirst(HttpServletRequest request, String name, String fallback) {
        String value = request.getHeader(name);
        if (StringUtils.hasText(value)) {
            int comma = value.indexOf(',');
            return comma >= 0 ? value.substring(0, comma).trim() : value.trim();
        }
        return fallback == null ? "" : fallback.trim();
    }

    private static String trimTrailingSlash(String value) {
        if (!StringUtils.hasText(value)) {
            return "";
        }
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }
}
