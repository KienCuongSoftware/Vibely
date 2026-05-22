package com.vibely.backend.share.redis;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vibely.backend.share.ShareProperties;
import com.vibely.backend.share.ShortLinkCacheEntry;
import com.vibely.backend.share.ShortLinkStatus;
import java.time.Duration;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

@ExtendWith(MockitoExtension.class)
class RedisShortLinkCacheTest {

    @Mock
    private StringRedisTemplate redis;

    @Mock
    private ValueOperations<String, String> valueOps;

    private RedisShortLinkCache cache;

    @BeforeEach
    void setUp() {
        when(redis.opsForValue()).thenReturn(valueOps);
        RedisShareProperties redisProps = new RedisShareProperties();
        redisProps.setKeyPrefix("vibely");
        ShareProperties shareProps = new ShareProperties();
        shareProps.setRedirectCacheTtlSeconds(3600);
        shareProps.setNegativeCacheTtlSeconds(60);
        cache = new RedisShortLinkCache(redis, redisProps, shareProps, new ObjectMapper());
    }

    @Test
    void get_deserializesCachedPayload() {
        when(valueOps.get("vibely:sl:abc123"))
            .thenReturn("{\"videoId\":29,\"shortCode\":\"abc123\",\"status\":\"ACTIVE\"}");

        Optional<ShortLinkCacheEntry> entry = cache.get("abc123");

        assertThat(entry).isPresent();
        assertThat(entry.get().videoId()).isEqualTo(29L);
        assertThat(entry.get().status()).isEqualTo(ShortLinkStatus.ACTIVE);
    }

    @Test
    void markMiss_setsShortLivedKey() {
        cache.markMiss("missing");

        verify(valueOps).set(
            eq("vibely:sl:miss:missing"),
            eq("1"),
            eq(Duration.ofSeconds(60))
        );
    }
}
