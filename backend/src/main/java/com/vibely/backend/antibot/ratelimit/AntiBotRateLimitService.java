package com.vibely.backend.antibot.ratelimit;

import com.vibely.backend.antibot.config.AntiBotProperties;
import com.vibely.backend.antibot.redis.AntiBotRedisKeys;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
public class AntiBotRateLimitService {

    private static final long WINDOW_SECONDS = 60L;

    private final AntiBotProperties properties;
    private final StringRedisTemplate redis;
    private final Map<String, CounterWindow> inMemory = new ConcurrentHashMap<>();

    public AntiBotRateLimitService(
        AntiBotProperties properties,
        @org.springframework.beans.factory.annotation.Autowired(required = false)
        StringRedisTemplate shareStringRedisTemplate
    ) {
        this.properties = properties;
        this.redis = shareStringRedisTemplate;
    }

    public boolean allow(String scope, String subject, int limitPerMinute) {
        String key = properties.prefixed(AntiBotRedisKeys.RATE_LIMIT + scope + ":" + subject);
        if (redis != null) {
            return allowRedis(key, limitPerMinute);
        }
        return allowInMemory(key, limitPerMinute);
    }

    private boolean allowRedis(String key, int limitPerMinute) {
        Long count = redis.opsForValue().increment(key);
        if (count == null) {
            return true;
        }
        if (count == 1L) {
            redis.expire(key, Duration.ofSeconds(WINDOW_SECONDS));
        }
        return count <= limitPerMinute;
    }

    private boolean allowInMemory(String key, int limitPerMinute) {
        long now = System.currentTimeMillis();
        CounterWindow window = inMemory.compute(key, (k, existing) -> {
            if (existing == null || now - existing.windowStartMs > WINDOW_SECONDS * 1000L) {
                return new CounterWindow(now, 1);
            }
            existing.count++;
            return existing;
        });
        return window.count <= limitPerMinute;
    }

    private static final class CounterWindow {
        private final long windowStartMs;
        private int count;

        private CounterWindow(long windowStartMs, int count) {
            this.windowStartMs = windowStartMs;
            this.count = count;
        }
    }
}
