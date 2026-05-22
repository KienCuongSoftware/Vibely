package com.vibely.backend.share;

import java.util.Optional;

/**
 * Redis-first short link resolver cache.
 * Key: {@code sl:{shortCode}} — TTL {@link ShareProperties#getRedirectCacheTtlSeconds()}.
 * Invalidation: on REVOKED/EXPIRED or video delete (CASCADE handles DB; cache DEL on write path).
 */
public interface ShortLinkCache {

    Optional<ShortLinkCacheEntry> get(String shortCode);

    void put(ShortLinkCacheEntry entry);

    void evict(String shortCode);

    /** True when a recent lookup proved the code does not exist (Redis negative cache). */
    default boolean isKnownMiss(String shortCode) {
        return false;
    }

    /** Remember unknown short code briefly to protect Postgres under scan traffic. */
    default void markMiss(String shortCode) {}
}
