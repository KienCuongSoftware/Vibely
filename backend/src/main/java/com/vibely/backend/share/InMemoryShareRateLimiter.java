package com.vibely.backend.share;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "app.redis.enabled", havingValue = "false", matchIfMissing = true)
public class InMemoryShareRateLimiter implements ShareRateLimiter {

    private static final long WINDOW_SECONDS = 60L;

    private final Map<String, Counter> counters = new ConcurrentHashMap<>();
    private final ShareProperties shareProperties;

    public InMemoryShareRateLimiter(ShareProperties shareProperties) {
        this.shareProperties = shareProperties;
    }

    @Override
    public boolean allowRedirect(String clientIp) {
        return allow(bucket("redirect", clientIp), shareProperties.getRedirectRateLimitPerMinute());
    }

    @Override
    public boolean allowShareWrite(String subjectKey) {
        return allow(bucket("share", subjectKey), shareProperties.getShareWriteRateLimitPerMinute());
    }

    private boolean allow(String bucket, int limit) {
        long now = Instant.now().getEpochSecond();
        Counter counter = counters.computeIfAbsent(bucket, ignored -> new Counter(now, 0));
        synchronized (counter) {
            if (now - counter.windowStart >= WINDOW_SECONDS) {
                counter.windowStart = now;
                counter.requestCount = 0;
            }
            counter.requestCount++;
            return counter.requestCount <= limit;
        }
    }

    private static String bucket(String kind, String raw) {
        String subject = raw == null || raw.isBlank() ? "unknown" : raw.trim();
        return kind + ":" + subject;
    }

    private static class Counter {
        private long windowStart;
        private int requestCount;

        private Counter(long windowStart, int requestCount) {
            this.windowStart = windowStart;
            this.requestCount = requestCount;
        }
    }
}
