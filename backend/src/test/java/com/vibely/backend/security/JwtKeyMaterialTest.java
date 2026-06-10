package com.vibely.backend.security;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class JwtKeyMaterialTest {

    @Test
    void flagsKnownWeakSecrets() {
        assertTrue(JwtKeyMaterial.isWeak("change-this-in-real-environments"));
        assertTrue(JwtKeyMaterial.isWeak(""));
        assertFalse(JwtKeyMaterial.isWeak("test-secret-key-with-at-least-thirty-two-chars"));
    }

    @Test
    void resolvesUtf8AndBase64KeyMaterial() {
        byte[] utf8 = JwtKeyMaterial.resolveBytes(
            "test-secret-key-with-at-least-thirty-two-chars"
        );
        assertTrue(utf8.length >= 32);

        byte[] base64 = JwtKeyMaterial.resolveBytes(
            "dGVzdC1zZWNyZXQta2V5LXdpdGgtYXQtbGVhc3QtdGhpcnR5LXR3by1jaGFycw=="
        );
        assertTrue(base64.length >= 32);
    }
}
