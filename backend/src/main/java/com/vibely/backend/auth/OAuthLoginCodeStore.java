package com.vibely.backend.auth;

import com.vibely.backend.common.BadRequestException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

@Component
public class OAuthLoginCodeStore {

    private static final long CODE_TTL_SECONDS = 120;
    private static final long CLEANUP_INTERVAL_SECONDS = 60;
    private final SecureRandom secureRandom = new SecureRandom();
    private final Map<String, StoredAuthResponse> pendingLogins = new ConcurrentHashMap<>();
    private volatile long lastCleanupEpochSecond = 0L;

    public String createCode(AuthResponse authResponse) {
        cleanupIfNeeded();
        String code = generateCode();
        pendingLogins.put(code, new StoredAuthResponse(authResponse, Instant.now().plusSeconds(CODE_TTL_SECONDS)));
        return code;
    }

    public AuthResponse consumeCode(String code) {
        cleanupIfNeeded();
        StoredAuthResponse stored = pendingLogins.remove(code);
        if (stored == null || stored.expiresAt().isBefore(Instant.now())) {
            throw new BadRequestException("Mã đăng nhập Google không hợp lệ hoặc đã hết hạn");
        }
        return stored.authResponse();
    }

    private String generateCode() {
        byte[] randomBytes = new byte[32];
        secureRandom.nextBytes(randomBytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
    }

    private void cleanupIfNeeded() {
        long nowEpoch = Instant.now().getEpochSecond();
        if (nowEpoch - lastCleanupEpochSecond < CLEANUP_INTERVAL_SECONDS) {
            return;
        }
        lastCleanupEpochSecond = nowEpoch;
        pendingLogins.entrySet().removeIf(entry -> entry.getValue().expiresAt().isBefore(Instant.now()));
    }

    private record StoredAuthResponse(AuthResponse authResponse, Instant expiresAt) {
    }
}
