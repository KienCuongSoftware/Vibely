package com.vibely.backend.share;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import java.time.Duration;
import java.util.Optional;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * In-process cache when {@code app.redis.enabled=false}. Same key semantics as Redis {@code sl:{code}}.
 */
@Component
@ConditionalOnProperty(name = "app.redis.enabled", havingValue = "false", matchIfMissing = true)
public class CaffeineShortLinkCache implements ShortLinkCache {

    private final Cache<String, ShortLinkCacheEntry> cache;

    public CaffeineShortLinkCache(ShareProperties shareProperties) {
        this.cache = Caffeine.newBuilder()
            .maximumSize(50_000)
            .expireAfterWrite(Duration.ofSeconds(shareProperties.getRedirectCacheTtlSeconds()))
            .build();
    }

    @Override
    public Optional<ShortLinkCacheEntry> get(String shortCode) {
        return Optional.ofNullable(cache.getIfPresent(normalize(shortCode)));
    }

    @Override
    public void put(ShortLinkCacheEntry entry) {
        if (entry == null || entry.shortCode() == null) {
            return;
        }
        cache.put(normalize(entry.shortCode()), entry);
    }

    @Override
    public void evict(String shortCode) {
        cache.invalidate(normalize(shortCode));
    }

    private static String normalize(String shortCode) {
        return shortCode == null ? "" : shortCode.trim();
    }
}
