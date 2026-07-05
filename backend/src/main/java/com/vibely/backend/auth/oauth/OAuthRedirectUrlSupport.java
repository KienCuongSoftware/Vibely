package com.vibely.backend.auth.oauth;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.util.StringUtils;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

/** OAuth redirect dựa trên host công khai (tunnel/LAN) hoặc {@code app.oauth2.public-base-url}. */
public final class OAuthRedirectUrlSupport {

    private OAuthRedirectUrlSupport() {}

    /** Origin công khai, ví dụ {@code https://xxx.trycloudflare.com}. */
    public static String resolvePublicOrigin(
        HttpServletRequest request,
        String configuredPublicBaseUrl,
        String frontendBaseUrl
    ) {
        if (StringUtils.hasText(configuredPublicBaseUrl)) {
            return trimTrailingSlash(configuredPublicBaseUrl.trim());
        }
        String requestOrigin = resolveRequestOrigin(request);
        if (isBackendDevOrigin(requestOrigin) && StringUtils.hasText(frontendBaseUrl)) {
            return trimTrailingSlash(frontendBaseUrl);
        }
        if (isLocalhostOrigin(requestOrigin) && StringUtils.hasText(frontendBaseUrl)) {
            return trimTrailingSlash(frontendBaseUrl);
        }
        if (isLocalhostOrigin(requestOrigin)) {
            return requestOrigin;
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
        String configuredPublicBaseUrl,
        String frontendBaseUrl
    ) {
        String requestOrigin = resolveRequestOrigin(request);
        if (isBackendDevOrigin(requestOrigin) || isLocalhostOrigin(requestOrigin)) {
            return configuredFallback;
        }
        String origin = resolvePublicOrigin(request, configuredPublicBaseUrl, frontendBaseUrl);
        if (StringUtils.hasText(origin)) {
            return origin + "/login";
        }
        return configuredFallback;
    }

    /** Vite proxy chưa gửi X-Forwarded-Host — backend thấy :8080 thay vì frontend :5173. */
    static boolean isBackendDevOrigin(String origin) {
        if (!StringUtils.hasText(origin)) {
            return false;
        }
        String normalized = origin.toLowerCase();
        return normalized.equals("http://localhost:8080")
            || normalized.equals("https://localhost:8080")
            || normalized.equals("http://127.0.0.1:8080")
            || normalized.equals("https://127.0.0.1:8080");
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
