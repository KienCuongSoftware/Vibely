package com.vibely.backend.share.redis;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vibely.backend.share.ShareProperties;
import com.vibely.backend.share.ShortLinkCache;
import com.vibely.backend.share.ShortLinkCacheEntry;
import com.vibely.backend.share.ShortLinkStatus;
import java.time.Duration;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "app.redis.enabled", havingValue = "true")
public class RedisShortLinkCache implements ShortLinkCache {

    private static final Logger log = LoggerFactory.getLogger(RedisShortLinkCache.class);
    private static final String MISS_MARKER = "1";

    private final StringRedisTemplate redis;
    private final RedisShareProperties redisShareProperties;
    private final ShareProperties shareProperties;
    private final ObjectMapper objectMapper;

    public RedisShortLinkCache(
        StringRedisTemplate shareStringRedisTemplate,
        RedisShareProperties redisShareProperties,
        ShareProperties shareProperties,
        ObjectMapper objectMapper
    ) {
        this.redis = shareStringRedisTemplate;
        this.redisShareProperties = redisShareProperties;
        this.shareProperties = shareProperties;
        this.objectMapper = objectMapper;
    }

    @Override
    public Optional<ShortLinkCacheEntry> get(String shortCode) {
        String normalized = normalize(shortCode);
        if (normalized.isEmpty()) {
            return Optional.empty();
        }
        String raw = redis.opsForValue().get(key(normalized));
        if (raw == null || raw.isBlank()) {
            return Optional.empty();
        }
        try {
            CachedPayload payload = objectMapper.readValue(raw, CachedPayload.class);
            return Optional.of(new ShortLinkCacheEntry(
                payload.videoId(),
                payload.shortCode(),
                ShortLinkStatus.valueOf(payload.status())
            ));
        } catch (Exception ex) {
            log.warn("Invalid short link cache payload key={}", normalized, ex);
            evict(normalized);
            return Optional.empty();
        }
    }

    @Override
    public void put(ShortLinkCacheEntry entry) {
        if (entry == null || entry.shortCode() == null) {
            return;
        }
        String normalized = normalize(entry.shortCode());
        try {
            String json = objectMapper.writeValueAsString(new CachedPayload(
                entry.videoId(),
                normalized,
                entry.status().name()
            ));
            redis.opsForValue().set(
                key(normalized),
                json,
                Duration.ofSeconds(shareProperties.getRedirectCacheTtlSeconds())
            );
            redis.delete(missKey(normalized));
        } catch (JsonProcessingException ex) {
            log.warn("Failed to serialize short link cache entry code={}", normalized, ex);
        }
    }

    @Override
    public void evict(String shortCode) {
        String normalized = normalize(shortCode);
        if (normalized.isEmpty()) {
            return;
        }
        redis.delete(key(normalized));
        redis.delete(missKey(normalized));
    }

    @Override
    public boolean isKnownMiss(String shortCode) {
        String normalized = normalize(shortCode);
        if (normalized.isEmpty()) {
            return false;
        }
        return MISS_MARKER.equals(redis.opsForValue().get(missKey(normalized)));
    }

    @Override
    public void markMiss(String shortCode) {
        String normalized = normalize(shortCode);
        if (normalized.isEmpty()) {
            return;
        }
        redis.opsForValue().set(
            missKey(normalized),
            MISS_MARKER,
            Duration.ofSeconds(shareProperties.getNegativeCacheTtlSeconds())
        );
    }

    private String key(String shortCode) {
        return redisShareProperties.prefixed(ShareRedisKeys.SHORT_LINK + shortCode);
    }

    private String missKey(String shortCode) {
        return redisShareProperties.prefixed(ShareRedisKeys.SHORT_LINK_MISS + shortCode);
    }

    private static String normalize(String shortCode) {
        return shortCode == null ? "" : shortCode.trim();
    }

    private record CachedPayload(long videoId, String shortCode, String status) {}
}
