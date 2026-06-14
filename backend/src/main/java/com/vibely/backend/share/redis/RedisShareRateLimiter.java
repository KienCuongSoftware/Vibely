package com.vibely.backend.share.redis;

import com.vibely.backend.share.ShareHashing;
import com.vibely.backend.share.ShareProperties;
import com.vibely.backend.share.ShareRateLimiter;
import java.time.Duration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "app.redis.enabled", havingValue = "true")
public class RedisShareRateLimiter implements ShareRateLimiter {

    private static final Logger log = LoggerFactory.getLogger(RedisShareRateLimiter.class);
    private static final long WINDOW_SECONDS = 60L;

    private final StringRedisTemplate redis;
    private final RedisShareProperties redisShareProperties;
    private final ShareProperties shareProperties;
    private volatile boolean redisUnavailableLogged;

    public RedisShareRateLimiter(
        StringRedisTemplate shareStringRedisTemplate,
        RedisShareProperties redisShareProperties,
        ShareProperties shareProperties
    ) {
        this.redis = shareStringRedisTemplate;
        this.redisShareProperties = redisShareProperties;
        this.shareProperties = shareProperties;
    }

    @Override
    public boolean allowRedirect(String clientIp) {
        String hash = ShareHashing.sha256Hex(clientIp == null ? "unknown" : clientIp.trim());
        return allow(
            redisShareProperties.prefixed(ShareRedisKeys.RATE_REDIRECT + hash),
            shareProperties.getRedirectRateLimitPerMinute()
        );
    }

    @Override
    public boolean allowShareWrite(String subjectKey) {
        String hash = ShareHashing.sha256Hex(subjectKey == null ? "unknown" : subjectKey.trim());
        return allow(
            redisShareProperties.prefixed(ShareRedisKeys.RATE_SHARE + hash),
            shareProperties.getShareWriteRateLimitPerMinute()
        );
    }

    @Override
    public boolean allowSharePreview(String clientIp) {
        String hash = ShareHashing.sha256Hex(clientIp == null ? "unknown" : clientIp.trim());
        return allow(
            redisShareProperties.prefixed(ShareRedisKeys.RATE_SHARE_PREVIEW + hash),
            shareProperties.getSharePreviewRateLimitPerMinute()
        );
    }

    @Override
    public boolean allowViewRecord(String clientIp) {
        String hash = ShareHashing.sha256Hex(clientIp == null ? "unknown" : clientIp.trim());
        return allow(
            redisShareProperties.prefixed(ShareRedisKeys.RATE_VIEW + hash),
            shareProperties.getViewRecordRateLimitPerMinute()
        );
    }

    @Override
    public boolean allowPublicShare(String clientIp) {
        String hash = ShareHashing.sha256Hex(clientIp == null ? "unknown" : clientIp.trim());
        return allow(
            redisShareProperties.prefixed(ShareRedisKeys.RATE_PUBLIC_SHARE + hash),
            shareProperties.getPublicShareRateLimitPerMinute()
        );
    }

    @Override
    public boolean allowDownload(String subjectKey) {
        String hash = ShareHashing.sha256Hex(subjectKey == null ? "unknown" : subjectKey.trim());
        return allow(
            redisShareProperties.prefixed(ShareRedisKeys.RATE_DOWNLOAD + hash),
            shareProperties.getDownloadRateLimitPerMinute()
        );
    }

    @Override
    public boolean allowAntiBot(String clientIp) {
        String hash = ShareHashing.sha256Hex(clientIp == null ? "unknown" : clientIp.trim());
        return allow(
            redisShareProperties.prefixed(ShareRedisKeys.RATE_ANTIBOT + hash),
            shareProperties.getAntibotRateLimitPerMinute()
        );
    }

    private boolean allow(String redisKey, int limit) {
        try {
            Long count = redis.opsForValue().increment(redisKey);
            if (count == null) {
                return true;
            }
            if (count == 1L) {
                redis.expire(redisKey, Duration.ofSeconds(WINDOW_SECONDS));
            }
            return count <= limit;
        } catch (RuntimeException ex) {
            if (!redisUnavailableLogged) {
                log.warn("Redis rate limiter unavailable — allowing requests (start Redis or set app.redis.enabled=false): {}",
                    ex.getMessage());
                redisUnavailableLogged = true;
            }
            return true;
        }
    }
}
