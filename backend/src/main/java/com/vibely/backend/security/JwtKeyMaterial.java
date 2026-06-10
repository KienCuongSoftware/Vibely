package com.vibely.backend.security;

import io.jsonwebtoken.io.Decoders;
import java.nio.charset.StandardCharsets;
import java.util.Set;

public final class JwtKeyMaterial {

    private static final Set<String> WEAK_SECRETS = Set.of(
        "",
        "change-this-in-real-environments",
        "changeme",
        "secret",
        "jwt-secret"
    );

    private JwtKeyMaterial() {
    }

    public static boolean isWeak(String secret) {
        if (secret == null || secret.isBlank()) {
            return true;
        }
        return WEAK_SECRETS.contains(secret.toLowerCase());
    }

    public static byte[] resolveBytes(String secret) {
        if (secret.matches("^[A-Za-z0-9+/=]+$")) {
            try {
                return Decoders.BASE64.decode(secret);
            } catch (IllegalArgumentException ex) {
                return secret.getBytes(StandardCharsets.UTF_8);
            }
        }
        return secret.getBytes(StandardCharsets.UTF_8);
    }
}
