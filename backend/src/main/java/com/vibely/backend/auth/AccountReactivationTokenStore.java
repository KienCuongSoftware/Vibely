package com.vibely.backend.auth;

import com.vibely.backend.common.BadRequestException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

@Component
public class AccountReactivationTokenStore {

    private static final long TOKEN_TTL_SECONDS = 600;
    private static final long CLEANUP_INTERVAL_SECONDS = 60;
    private final SecureRandom secureRandom = new SecureRandom();
    private final Map<String, StoredEmail> pendingReactivations = new ConcurrentHashMap<>();
    private volatile long lastCleanupEpochSecond = 0L;

    public String createToken(String email) {
        cleanupIfNeeded();
        String token = generateToken();
        pendingReactivations.put(token, new StoredEmail(email, Instant.now().plusSeconds(TOKEN_TTL_SECONDS)));
        return token;
    }

    public String resolveEmail(String token) {
        cleanupIfNeeded();
        StoredEmail stored = pendingReactivations.get(token);
        if (stored == null || stored.expiresAt().isBefore(Instant.now())) {
            throw new BadRequestException("Phiên kích hoạt lại tài khoản không hợp lệ hoặc đã hết hạn");
        }
        return stored.email();
    }

    public void invalidate(String token) {
        pendingReactivations.remove(token);
    }

    private String generateToken() {
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
        pendingReactivations.entrySet().removeIf(entry -> entry.getValue().expiresAt().isBefore(Instant.now()));
    }

    private record StoredEmail(String email, Instant expiresAt) {
    }
}
