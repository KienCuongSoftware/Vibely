package com.vibely.backend.share;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.share")
public class ShareProperties {

    private int shortCodeLength = 8;
    private long redirectCacheTtlSeconds = 604800L;
    private int idempotencyWindowHours = 24;
    private int redirectRateLimitPerMinute = 120;
    private int shareWriteRateLimitPerMinute = 40;
    private long negativeCacheTtlSeconds = 60L;

    public int getShortCodeLength() {
        return shortCodeLength;
    }

    public void setShortCodeLength(int shortCodeLength) {
        this.shortCodeLength = shortCodeLength;
    }

    public long getRedirectCacheTtlSeconds() {
        return redirectCacheTtlSeconds;
    }

    public void setRedirectCacheTtlSeconds(long redirectCacheTtlSeconds) {
        this.redirectCacheTtlSeconds = redirectCacheTtlSeconds;
    }

    public int getIdempotencyWindowHours() {
        return idempotencyWindowHours;
    }

    public void setIdempotencyWindowHours(int idempotencyWindowHours) {
        this.idempotencyWindowHours = idempotencyWindowHours;
    }

    public int getRedirectRateLimitPerMinute() {
        return redirectRateLimitPerMinute;
    }

    public void setRedirectRateLimitPerMinute(int redirectRateLimitPerMinute) {
        this.redirectRateLimitPerMinute = redirectRateLimitPerMinute;
    }

    public int getShareWriteRateLimitPerMinute() {
        return shareWriteRateLimitPerMinute;
    }

    public void setShareWriteRateLimitPerMinute(int shareWriteRateLimitPerMinute) {
        this.shareWriteRateLimitPerMinute = shareWriteRateLimitPerMinute;
    }

    public long getNegativeCacheTtlSeconds() {
        return negativeCacheTtlSeconds;
    }

    public void setNegativeCacheTtlSeconds(long negativeCacheTtlSeconds) {
        this.negativeCacheTtlSeconds = negativeCacheTtlSeconds;
    }
}
