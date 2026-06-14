package com.vibely.backend.share.redis;

/**
 * Redis key naming (prefixed by {@code app.redis.key-prefix}, default {@code vibely}).
 *
 * <ul>
 *   <li>{@code sl:{shortCode}} — redirect resolver payload (JSON)</li>
 *   <li>{@code sl:miss:{shortCode}} — negative cache for unknown codes (short TTL)</li>
 *   <li>{@code ratelimit:redirect:{ipHash}} — redirect IP throttle</li>
 *   <li>{@code ratelimit:share:{subjectHash}} — share write throttle</li>
 *   <li>{@code video:share_count:{videoId}} — optional hot counter mirror</li>
 * </ul>
 */
public final class ShareRedisKeys {

    public static final String SHORT_LINK = "sl:";
    public static final String SHORT_LINK_MISS = "sl:miss:";
    public static final String RATE_REDIRECT = "ratelimit:redirect:";
    public static final String RATE_SHARE = "ratelimit:share:";
    public static final String RATE_SHARE_PREVIEW = "ratelimit:share-preview:";
    public static final String RATE_VIEW = "ratelimit:view:";
    public static final String RATE_PUBLIC_SHARE = "ratelimit:public-share:";
    public static final String RATE_DOWNLOAD = "ratelimit:download:";
    public static final String RATE_ANTIBOT = "ratelimit:antibot:";
    public static final String VIDEO_SHARE_COUNT = "video:share_count:";

    private ShareRedisKeys() {}
}
