package com.vibely.backend.antibot.security;

import com.vibely.backend.antibot.config.AntiBotProperties;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Optional;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Component;

@Component
public class AntiBotTokenSigner {

    private final byte[] secret;

    public AntiBotTokenSigner(AntiBotProperties properties) {
        this.secret = properties.getHmacSecret().getBytes(StandardCharsets.UTF_8);
    }

    public String sign(String payload) {
        return hmacHex(payload);
    }

    public boolean verify(String payload, String signature) {
        if (signature == null || signature.isBlank()) {
            return false;
        }
        String expected = hmacHex(payload);
        return MessageDigest.isEqual(
            expected.getBytes(StandardCharsets.UTF_8),
            signature.getBytes(StandardCharsets.UTF_8)
        );
    }

    public String challengeToken(String challengeId, long expiresAtEpochMs) {
        String payload = challengeId + "." + expiresAtEpochMs;
        return payload + "." + sign(payload);
    }

    public boolean verifyChallengeToken(String challengeId, long expiresAtEpochMs, String token) {
        if (Instant.now().toEpochMilli() > expiresAtEpochMs) {
            return false;
        }
        String payload = challengeId + "." + expiresAtEpochMs;
        String expected = payload + "." + sign(payload);
        return MessageDigest.isEqual(
            expected.getBytes(StandardCharsets.UTF_8),
            token.getBytes(StandardCharsets.UTF_8)
        );
    }

    public String verificationToken(String purpose, String challengeId, long expiresAtEpochMs) {
        String payload = "verify:" + purpose + ":" + challengeId + "." + expiresAtEpochMs;
        return payload + "." + sign(payload);
    }

    public Optional<VerificationTokenClaims> parseVerificationToken(String token, String expectedPurpose) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }
        int lastDot = token.lastIndexOf('.');
        if (lastDot <= 0) {
            return Optional.empty();
        }
        String payload = token.substring(0, lastDot);
        String signature = token.substring(lastDot + 1);
        if (!verify(payload, signature)) {
            return Optional.empty();
        }
        if (!payload.startsWith("verify:")) {
            return Optional.empty();
        }
        String body = payload.substring("verify:".length());
        int purposeSep = body.indexOf(':');
        int expiresSep = body.lastIndexOf('.');
        if (purposeSep <= 0 || expiresSep <= purposeSep) {
            return Optional.empty();
        }
        String purpose = body.substring(0, purposeSep);
        String challengeId = body.substring(purposeSep + 1, expiresSep);
        if (!purpose.equalsIgnoreCase(expectedPurpose)) {
            return Optional.empty();
        }
        try {
            long expires = Long.parseLong(body.substring(expiresSep + 1));
            if (Instant.now().toEpochMilli() > expires) {
                return Optional.empty();
            }
            return Optional.of(new VerificationTokenClaims(purpose.toUpperCase(), challengeId, expires));
        } catch (NumberFormatException ex) {
            return Optional.empty();
        }
    }

    public boolean verifyVerificationToken(String token) {
        if (token == null || token.isBlank()) {
            return false;
        }
        int lastDot = token.lastIndexOf('.');
        if (lastDot <= 0) {
            return false;
        }
        String payload = token.substring(0, lastDot);
        String signature = token.substring(lastDot + 1);
        if (!verify(payload, signature)) {
            return false;
        }
        int expiresIdx = payload.lastIndexOf('.');
        if (expiresIdx <= 0) {
            return false;
        }
        try {
            long expires = Long.parseLong(payload.substring(expiresIdx + 1));
            return Instant.now().toEpochMilli() <= expires;
        } catch (NumberFormatException ex) {
            return false;
        }
    }

    private String hmacHex(String payload) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret, "HmacSHA256"));
            byte[] raw = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(raw);
        } catch (NoSuchAlgorithmException | InvalidKeyException ex) {
            throw new IllegalStateException("HMAC unavailable", ex);
        }
    }
}
