package com.vibely.backend.security;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Locale;
import java.util.Set;

/** Shared checks for worker {@code X-Internal-Token} headers. */
public final class InternalTokenSecurity {

    private static final Set<String> WEAK_DEFAULTS = Set.of(
        "",
        "vibely-dev-originality-token",
        "vibely-dev-moderation-token",
        "vibely-dev-cu-token",
        "vibely-dev-enhance-token",
        "vibely-dev-translation-token",
        "changeme",
        "secret",
        "token"
    );

    private InternalTokenSecurity() {}

    public static boolean isWeakDefault(String token) {
        if (token == null) {
            return true;
        }
        String trimmed = token.trim();
        if (trimmed.length() < 24) {
            return true;
        }
        return WEAK_DEFAULTS.contains(trimmed.toLowerCase(Locale.ROOT));
    }

    public static boolean matches(String expected, String provided) {
        if (expected == null || provided == null) {
            return false;
        }
        byte[] a = expected.getBytes(StandardCharsets.UTF_8);
        byte[] b = provided.getBytes(StandardCharsets.UTF_8);
        return MessageDigest.isEqual(a, b);
    }
}
