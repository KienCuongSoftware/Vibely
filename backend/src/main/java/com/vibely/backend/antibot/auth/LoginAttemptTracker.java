package com.vibely.backend.antibot.auth;

import com.vibely.backend.antibot.config.AntiBotProperties;
import com.vibely.backend.antibot.redis.AntiBotRedisKeys;
import com.vibely.backend.antibot.security.AntiBotHashing;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

@Component
public class LoginAttemptTracker {

    private final AntiBotProperties properties;
    private final StringRedisTemplate redis;
    private final Map<String, Counter> memory = new ConcurrentHashMap<>();

    public LoginAttemptTracker(
        AntiBotProperties properties,
        @Autowired(required = false) StringRedisTemplate shareStringRedisTemplate
    ) {
        this.properties = properties;
        this.redis = shareStringRedisTemplate;
    }

    public void recordFailure(String ip, String email) {
        increment(key("ip", ip));
        increment(key("email", email));
    }

    public void recordSuccess(String ip, String email) {
        // Soft reset on success — reduces false positives for shared IPs.
        decrement(key("ip", ip));
        decrement(key("email", email));
    }

    public int recentFailuresByEmail(String email) {
        return read(key("email", email));
    }

    public int recentFailuresByIp(String ip) {
        return read(key("ip", ip));
    }

    public boolean isBlocked(String ip, String email) {
        int ipFails = recentFailuresByIp(ip);
        int emailFails = recentFailuresByEmail(email);
        return ipFails >= properties.getMaxFailedLoginsPerIpPerHour()
            || emailFails >= properties.getMaxFailedLoginsPerEmailPerHour();
    }

    private String key(String scope, String raw) {
        return scope + ":" + AntiBotHashing.sha256Hex(raw == null ? "unknown" : raw.trim().toLowerCase());
    }

    private void increment(String scopedKey) {
        String redisKey = properties.prefixed(AntiBotRedisKeys.RATE_LIMIT + "login-fail:" + scopedKey);
        if (redis != null) {
            Long count = redis.opsForValue().increment(redisKey);
            if (count != null && count == 1L) {
                redis.expire(redisKey, Duration.ofHours(1));
            }
            return;
        }
        memory.compute(scopedKey, (k, existing) -> {
            long now = System.currentTimeMillis();
            if (existing == null || now - existing.windowStartMs > 3_600_000L) {
                return new Counter(now, 1);
            }
            existing.count++;
            return existing;
        });
    }

    private void decrement(String scopedKey) {
        String redisKey = properties.prefixed(AntiBotRedisKeys.RATE_LIMIT + "login-fail:" + scopedKey);
        if (redis != null) {
            String raw = redis.opsForValue().get(redisKey);
            if (raw == null) {
                return;
            }
            long next = Math.max(0, Long.parseLong(raw) - 1);
            redis.opsForValue().set(redisKey, String.valueOf(next), Duration.ofHours(1));
            return;
        }
        memory.computeIfPresent(scopedKey, (k, existing) -> {
            existing.count = Math.max(0, existing.count - 1);
            return existing;
        });
    }

    private int read(String scopedKey) {
        String redisKey = properties.prefixed(AntiBotRedisKeys.RATE_LIMIT + "login-fail:" + scopedKey);
        if (redis != null) {
            String raw = redis.opsForValue().get(redisKey);
            if (raw == null) {
                return 0;
            }
            try {
                return (int) Long.parseLong(raw);
            } catch (NumberFormatException ex) {
                return 0;
            }
        }
        Counter counter = memory.get(scopedKey);
        if (counter == null) {
            return 0;
        }
        if (System.currentTimeMillis() - counter.windowStartMs > 3_600_000L) {
            memory.remove(scopedKey);
            return 0;
        }
        return counter.count;
    }

    private static final class Counter {
        private final long windowStartMs;
        private int count;

        private Counter(long windowStartMs, int count) {
            this.windowStartMs = windowStartMs;
            this.count = count;
        }
    }
}
