package com.vibely.backend.share.redis;

import java.time.Duration;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

/**
 * Optional hot mirror of {@code videos.share_count} for read-heavy dashboards.
 * Source of truth remains PostgreSQL; reconcile periodically in production.
 */
@Component
@ConditionalOnProperty(name = "app.redis.enabled", havingValue = "true")
public class RedisShareCounterCache {

    private static final Duration TTL = Duration.ofHours(1);

    private final StringRedisTemplate redis;
    private final RedisShareProperties redisShareProperties;

    public RedisShareCounterCache(
        StringRedisTemplate shareStringRedisTemplate,
        RedisShareProperties redisShareProperties
    ) {
        this.redis = shareStringRedisTemplate;
        this.redisShareProperties = redisShareProperties;
    }

    public void increment(UUID videoPublicId) {
        String key = key(videoPublicId);
        Long value = redis.opsForValue().increment(key);
        if (value != null && value == 1L) {
            redis.expire(key, TTL);
        }
    }

    public long getOrZero(UUID videoPublicId) {
        String raw = redis.opsForValue().get(key(videoPublicId));
        if (raw == null || raw.isBlank()) {
            return 0L;
        }
        try {
            return Long.parseLong(raw);
        } catch (NumberFormatException ex) {
            return 0L;
        }
    }

    public void set(UUID videoPublicId, long count) {
        redis.opsForValue().set(key(videoPublicId), String.valueOf(count), TTL);
    }

    public void evict(UUID videoPublicId) {
        redis.delete(key(videoPublicId));
    }

    private String key(UUID videoPublicId) {
        return redisShareProperties.prefixed(ShareRedisKeys.VIDEO_SHARE_COUNT + videoPublicId);
    }
}
