package com.vibely.backend.security;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Arrays;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

@Service
public class AuthCookieService {

    public static final String ACCESS_COOKIE = "vibely_at";
    public static final String REFRESH_COOKIE = "vibely_rt";

    private final long accessExpirationSeconds;
    private final long refreshExpirationSeconds;
    private final boolean secure;
    private final String sameSite;
    private final String domain;

    public AuthCookieService(
        @Value("${app.jwt.expiration-seconds}") long accessExpirationSeconds,
        @Value("${app.jwt.refresh-expiration-seconds}") long refreshExpirationSeconds,
        @Value("${app.auth.cookie.secure:false}") boolean secure,
        @Value("${app.auth.cookie.same-site:Lax}") String sameSite,
        @Value("${app.auth.cookie.domain:}") String domain
    ) {
        this.accessExpirationSeconds = accessExpirationSeconds;
        this.refreshExpirationSeconds = refreshExpirationSeconds;
        this.secure = secure;
        this.sameSite = sameSite;
        this.domain = domain == null ? "" : domain.trim();
    }

    public void writeSessionCookies(
        HttpServletResponse response,
        String accessToken,
        String refreshToken
    ) {
        addCookie(response, ACCESS_COOKIE, accessToken, "/", (int) accessExpirationSeconds);
        addCookie(response, REFRESH_COOKIE, refreshToken, "/api/auth", (int) refreshExpirationSeconds);
    }

    public void clearSessionCookies(HttpServletResponse response) {
        addCookie(response, ACCESS_COOKIE, "", "/", 0);
        addCookie(response, REFRESH_COOKIE, "", "/api/auth", 0);
    }

    public Optional<String> readAccessToken(HttpServletRequest request) {
        return readCookie(request, ACCESS_COOKIE);
    }

    public Optional<String> readRefreshToken(HttpServletRequest request) {
        return readCookie(request, REFRESH_COOKIE);
    }

    private void addCookie(
        HttpServletResponse response,
        String name,
        String value,
        String path,
        int maxAgeSeconds
    ) {
        ResponseCookie.ResponseCookieBuilder builder = ResponseCookie.from(name, value)
            .httpOnly(true)
            .secure(secure)
            .path(path)
            .maxAge(maxAgeSeconds)
            .sameSite(sameSite);
        if (!domain.isEmpty()) {
            builder.domain(domain);
        }
        response.addHeader(HttpHeaders.SET_COOKIE, builder.build().toString());
    }

    private Optional<String> readCookie(HttpServletRequest request, String name) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return Optional.empty();
        }
        return Arrays.stream(cookies)
            .filter(cookie -> name.equals(cookie.getName()))
            .map(Cookie::getValue)
            .filter(value -> value != null && !value.isBlank())
            .findFirst();
    }
}
