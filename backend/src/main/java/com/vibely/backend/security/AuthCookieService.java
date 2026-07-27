package com.vibely.backend.security;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.Optional;
import java.util.Set;
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
        // Drop host-only leftovers so Domain=.vibely.sbs cookies win after apex↔www migration.
        clearSessionCookies(response);
        addCookie(response, ACCESS_COOKIE, accessToken, "/", (int) accessExpirationSeconds, domain);
        addCookie(response, REFRESH_COOKIE, refreshToken, "/", (int) refreshExpirationSeconds, domain);
    }

    public void clearSessionCookies(HttpServletResponse response) {
        for (String name : new String[] { ACCESS_COOKIE, REFRESH_COOKIE }) {
            for (String cookieDomain : domainsToClear()) {
                addCookie(response, name, "", "/", 0, cookieDomain);
            }
        }
    }

    public Optional<String> readAccessToken(HttpServletRequest request) {
        return readCookie(request, ACCESS_COOKIE);
    }

    public Optional<String> readRefreshToken(HttpServletRequest request) {
        return readCookie(request, REFRESH_COOKIE);
    }

    /**
     * Host-only (empty) plus configured domain, and legacy vibely hosts so old cookies cannot
     * shadow a newly issued Domain=.vibely.sbs session after OAuth.
     */
    private Set<String> domainsToClear() {
        Set<String> domains = new LinkedHashSet<>();
        domains.add(""); // host-only
        if (!domain.isEmpty()) {
            domains.add(domain);
        }
        domains.add(".vibely.sbs");
        domains.add("vibely.sbs");
        return domains;
    }

    private void addCookie(
        HttpServletResponse response,
        String name,
        String value,
        String path,
        int maxAgeSeconds,
        String cookieDomain
    ) {
        ResponseCookie.ResponseCookieBuilder builder = ResponseCookie.from(name, value)
            .httpOnly(true)
            .secure(secure)
            .path(path)
            .maxAge(maxAgeSeconds)
            .sameSite(sameSite);
        if (cookieDomain != null && !cookieDomain.isEmpty()) {
            builder.domain(cookieDomain);
        }
        response.addHeader(HttpHeaders.SET_COOKIE, builder.build().toString());
    }

    private Optional<String> readCookie(HttpServletRequest request, String name) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return Optional.empty();
        }
        // Prefer the last matching cookie — browsers may send host-only + Domain= duplicates.
        String value = null;
        for (Cookie cookie : cookies) {
            if (name.equals(cookie.getName()) && cookie.getValue() != null && !cookie.getValue().isBlank()) {
                value = cookie.getValue();
            }
        }
        return Optional.ofNullable(value);
    }
}
