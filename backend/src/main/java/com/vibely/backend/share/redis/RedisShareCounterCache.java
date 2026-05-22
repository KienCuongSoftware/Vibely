package com.vibely.backend.share.redis;

import java.time.Duration;
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

    public void increment(long videoId) {
        String key = key(videoId);
        Long value = redis.opsForValue().increment(key);
        if (value != null && value == 1L) {
            redis.expire(key, TTL);
        }
    }

    public long getOrZero(long videoId) {
        String raw = redis.opsForValue().get(key(videoId));
        if (raw == null || raw.isBlank()) {
            return 0L;
        }
        try {
            return Long.parseLong(raw);
        } catch (NumberFormatException ex) {
            return 0L;
        }
    }

    public void set(long videoId, long count) {
        redis.opsForValue().set(key(videoId), String.valueOf(count), TTL);
    }

    public void evict(long videoId) {
        redis.delete(key(videoId));
    }

    private String key(long videoId) {
        return redisShareProperties.prefixed(ShareRedisKeys.VIDEO_SHARE_COUNT + videoId);
    }
}
