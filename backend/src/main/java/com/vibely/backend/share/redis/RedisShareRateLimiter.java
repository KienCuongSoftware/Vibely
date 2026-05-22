package com.vibely.backend.share.redis;

import com.vibely.backend.share.ShareHashing;
import com.vibely.backend.share.ShareProperties;
import com.vibely.backend.share.ShareRateLimiter;
import java.time.Duration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "app.redis.enabled", havingValue = "true")
public class RedisShareRateLimiter implements ShareRateLimiter {

    private static final long WINDOW_SECONDS = 60L;

    private final StringRedisTemplate redis;
    private final RedisShareProperties redisShareProperties;
    private final ShareProperties shareProperties;

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

    private boolean allow(String redisKey, int limit) {
        Long count = redis.opsForValue().increment(redisKey);
        if (count == null) {
            return true;
        }
        if (count == 1L) {
            redis.expire(redisKey, Duration.ofSeconds(WINDOW_SECONDS));
        }
        return count <= limit;
    }
}
