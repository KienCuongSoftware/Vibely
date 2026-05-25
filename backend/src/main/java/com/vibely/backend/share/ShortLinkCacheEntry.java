package com.vibely.backend.share;

import java.util.UUID;

/** Cached redirect target for GET /v/{code}. Redis key: sl:{shortCode} (Phase 4). */
public record ShortLinkCacheEntry(
    UUID videoPublicId,
    String shortCode,
    ShortLinkStatus status
) {
    public boolean isActive() {
        return status == ShortLinkStatus.ACTIVE;
    }
}
