package com.vibely.backend.live.media;

import com.vibely.backend.live.config.LiveProperties;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * Media credentials. Publish tokens are random, single-use and stored only as a SHA-256 hash.
 * Playback tokens are short-lived HMAC-signed claims, so they need no storage and cannot be forged
 * or moved to another session. Stream names are random so they reveal neither the user nor the LIVE.
 */
@Component
public class LiveMediaTokenService {

    private static final Logger log = LoggerFactory.getLogger(LiveMediaTokenService.class);
    private static final String HMAC = "HmacSHA256";
    private static final Base64.Encoder B64 = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder B64_DECODER = Base64.getUrlDecoder();

    private final SecureRandom random = new SecureRandom();
    private final byte[] hmacKey;

    public LiveMediaTokenService(LiveProperties properties) {
        String secret = properties.getMedia().getTokenSecret();
        if (StringUtils.hasText(secret)) {
            this.hmacKey = sha256(secret.getBytes(StandardCharsets.UTF_8));
        } else {
            this.hmacKey = new byte[32];
            random.nextBytes(hmacKey);
            if (properties.getMedia().isEnabled()) {
                log.warn("live.media.token_secret_missing using a per-process key; playback tokens do not survive a restart");
            }
        }
    }

    public String newStreamName() {
        return "s" + randomHex(16);
    }

    public String newGuestViewerKey() {
        return "g" + randomHex(12);
    }

    public String newPublishToken() {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return B64.encodeToString(bytes);
    }

    public String hashPublishToken(String token) {
        return HexFormat.of().formatHex(sha256(token.getBytes(StandardCharsets.UTF_8)));
    }

    public String issuePlaybackToken(long sessionId, String viewerKey, Instant expiresAt) {
        String payload = sessionId + "." + viewerKey + "." + expiresAt.getEpochSecond();
        byte[] payloadBytes = payload.getBytes(StandardCharsets.UTF_8);
        return B64.encodeToString(payloadBytes) + "." + B64.encodeToString(hmac(payloadBytes));
    }

    /** Returns the claims only when the signature is valid and the token has not expired. */
    public Optional<PlaybackClaims> verifyPlaybackToken(String token, Instant now) {
        if (!StringUtils.hasText(token)) {
            return Optional.empty();
        }
        int dot = token.indexOf('.');
        if (dot <= 0 || dot != token.lastIndexOf('.')) {
            return Optional.empty();
        }
        try {
            byte[] payloadBytes = B64_DECODER.decode(token.substring(0, dot));
            byte[] signature = B64_DECODER.decode(token.substring(dot + 1));
            if (!MessageDigest.isEqual(hmac(payloadBytes), signature)) {
                return Optional.empty();
            }
            String[] parts = new String(payloadBytes, StandardCharsets.UTF_8).split("\\.");
            if (parts.length != 3) {
                return Optional.empty();
            }
            Instant expiresAt = Instant.ofEpochSecond(Long.parseLong(parts[2]));
            if (!expiresAt.isAfter(now)) {
                return Optional.empty();
            }
            return Optional.of(new PlaybackClaims(Long.parseLong(parts[0]), parts[1], expiresAt));
        } catch (IllegalArgumentException ex) {
            return Optional.empty();
        }
    }

    private String randomHex(int bytes) {
        byte[] buffer = new byte[bytes];
        random.nextBytes(buffer);
        return HexFormat.of().formatHex(buffer);
    }

    private byte[] hmac(byte[] payload) {
        try {
            Mac mac = Mac.getInstance(HMAC);
            mac.init(new SecretKeySpec(hmacKey, HMAC));
            return mac.doFinal(payload);
        } catch (GeneralSecurityException ex) {
            throw new IllegalStateException("HMAC unavailable", ex);
        }
    }

    private static byte[] sha256(byte[] input) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(input);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 unavailable", ex);
        }
    }

    public record PlaybackClaims(long sessionId, String viewerKey, Instant expiresAt) {}
}
