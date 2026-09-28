package com.vibely.backend.live.realtime;

/**
 * Redis key naming for LIVE (prefixed by {@code app.redis.key-prefix}, default {@code vibely}).
 * {@code {id}} is the internal LIVE id, never exposed to clients.
 *
 * <ul>
 *   <li>{@code live:{id}:status} — "LIVE" while the room accepts viewers (TTL, refreshed while live)</li>
 *   <li>{@code live:{id}:viewers} — hash viewerId -> open connections; HLEN is the unique viewer count</li>
 *   <li>{@code live:{id}:peak} — highest unique viewer count seen</li>
 *   <li>{@code live:{id}:likes} — hot like counter (seeded from lives.like_count)</li>
 *   <li>{@code live:{id}:likes:pending} — hash userId -> likes not yet flushed to live_likes</li>
 *   <li>{@code live:active} — set of LIVE ids flushed periodically to PostgreSQL</li>
 *   <li>{@code live:ratelimit:{bucket}} — fixed-window quota counters (chat, likes)</li>
 * </ul>
 */
final class LiveRedisKeys {

    static final String ACTIVE_SET = "live:active";
    static final String STATUS_LIVE = "LIVE";

    private LiveRedisKeys() {}

    static String status(long liveId) {
        return "live:" + liveId + ":status";
    }

    static String viewers(long liveId) {
        return "live:" + liveId + ":viewers";
    }

    static String peak(long liveId) {
        return "live:" + liveId + ":peak";
    }

    static String likes(long liveId) {
        return "live:" + liveId + ":likes";
    }

    static String pendingLikes(long liveId) {
        return "live:" + liveId + ":likes:pending";
    }

    static String rateLimit(String bucket) {
        return "live:ratelimit:" + bucket;
    }
}
