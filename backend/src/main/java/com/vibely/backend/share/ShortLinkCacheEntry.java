package com.vibely.backend.share;

/** Cached redirect target for GET /v/{code}. Redis key: sl:{shortCode} (Phase 4). */
public record ShortLinkCacheEntry(
    long videoId,
    String shortCode,
    ShortLinkStatus status
) {
    public boolean isActive() {
        return status == ShortLinkStatus.ACTIVE;
    }
}
