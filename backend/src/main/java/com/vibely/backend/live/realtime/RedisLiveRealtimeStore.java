package com.vibely.backend.live.realtime;

import com.vibely.backend.live.config.LiveProperties;
import com.vibely.backend.share.redis.RedisShareProperties;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.redis.connection.StringRedisConnection;
import org.springframework.data.redis.core.RedisCallback;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "app.redis.enabled", havingValue = "true")
public class RedisLiveRealtimeStore implements LiveRealtimeStore {

    // KEYS: status, viewers, peak | ARGV: viewerId, ttlMs -> {uniqueViewers, connectionsOfViewer} or {-1, 0}
    @SuppressWarnings("rawtypes")
    private static final RedisScript<List> JOIN = new DefaultRedisScript<>("""
        if redis.call('GET', KEYS[1]) ~= 'LIVE' then return {-1, 0} end
        local connections = redis.call('HINCRBY', KEYS[2], ARGV[1], 1)
        redis.call('PEXPIRE', KEYS[2], ARGV[2])
        local count = redis.call('HLEN', KEYS[2])
        local peak = tonumber(redis.call('GET', KEYS[3]) or '0')
        if count > peak then redis.call('SET', KEYS[3], count, 'PX', ARGV[2]) end
        return {count, connections}
        """, List.class);

    // KEYS: viewers | ARGV: viewerId -> {uniqueViewers, remainingConnections} (remaining = -1 when unknown viewer)
    @SuppressWarnings("rawtypes")
    private static final RedisScript<List> LEAVE = new DefaultRedisScript<>("""
        local current = tonumber(redis.call('HGET', KEYS[1], ARGV[1]) or '0')
        if current <= 0 then return {redis.call('HLEN', KEYS[1]), -1} end
        local remaining = redis.call('HINCRBY', KEYS[1], ARGV[1], -1)
        if remaining <= 0 then redis.call('HDEL', KEYS[1], ARGV[1]) end
        return {redis.call('HLEN', KEYS[1]), remaining}
        """, List.class);

    // KEYS: likes, pending | ARGV: userId, count, seed, ttlMs -> new total
    private static final RedisScript<Long> ADD_LIKES = new DefaultRedisScript<>("""
        redis.call('SET', KEYS[1], ARGV[3], 'NX', 'PX', ARGV[4])
        local total = redis.call('INCRBY', KEYS[1], ARGV[2])
        redis.call('PEXPIRE', KEYS[1], ARGV[4])
        redis.call('HINCRBY', KEYS[2], ARGV[1], ARGV[2])
        redis.call('PEXPIRE', KEYS[2], ARGV[4])
        return total
        """, Long.class);

    // KEYS: pending -> flat [userId, count, ...]; read and delete atomically so a tally is flushed once
    @SuppressWarnings("rawtypes")
    private static final RedisScript<List> DRAIN = new DefaultRedisScript<>("""
        local data = redis.call('HGETALL', KEYS[1])
        redis.call('DEL', KEYS[1])
        return data
        """, List.class);

    // KEYS: bucket | ARGV: requested, windowMs -> counter after increment
    private static final RedisScript<Long> ACQUIRE = new DefaultRedisScript<>("""
        local current = redis.call('INCRBY', KEYS[1], ARGV[1])
        if redis.call('PTTL', KEYS[1]) < 0 then redis.call('PEXPIRE', KEYS[1], ARGV[2]) end
        return current
        """, Long.class);

    private final StringRedisTemplate redis;
    private final RedisShareProperties redisProperties;
    private final LiveProperties liveProperties;

    public RedisLiveRealtimeStore(
        StringRedisTemplate shareStringRedisTemplate,
        RedisShareProperties redisProperties,
        LiveProperties liveProperties
    ) {
        this.redis = shareStringRedisTemplate;
        this.redisProperties = redisProperties;
        this.liveProperties = liveProperties;
    }

    @Override
    public void activate(long liveId) {
        redis.opsForValue().set(key(LiveRedisKeys.status(liveId)), LiveRedisKeys.STATUS_LIVE, ttl());
        redis.opsForSet().add(key(LiveRedisKeys.ACTIVE_SET), Long.toString(liveId));
    }

    @Override
    public void deactivate(long liveId) {
        redis.delete(key(LiveRedisKeys.status(liveId)));
        redis.opsForSet().remove(key(LiveRedisKeys.ACTIVE_SET), Long.toString(liveId));
    }

    @Override
    public boolean isActive(long liveId) {
        return LiveRedisKeys.STATUS_LIVE.equals(redis.opsForValue().get(key(LiveRedisKeys.status(liveId))));
    }

    @Override
    public void touch(long liveId) {
        Duration ttl = ttl();
        redis.expire(key(LiveRedisKeys.status(liveId)), ttl);
        redis.expire(key(LiveRedisKeys.viewers(liveId)), ttl);
        redis.expire(key(LiveRedisKeys.peak(liveId)), ttl);
        redis.expire(key(LiveRedisKeys.likes(liveId)), ttl);
    }

    @Override
    public ViewerChange join(long liveId, String viewerKey) {
        List<?> result = redis.execute(
            JOIN,
            List.of(
                key(LiveRedisKeys.status(liveId)),
                key(LiveRedisKeys.viewers(liveId)),
                key(LiveRedisKeys.peak(liveId))
            ),
            viewerKey,
            Long.toString(ttl().toMillis())
        );
        long count = asLong(result, 0);
        if (count < 0) {
            return ViewerChange.rejected();
        }
        return new ViewerChange(true, count, asLong(result, 1) == 1L);
    }

    @Override
    public ViewerChange leave(long liveId, String viewerKey) {
        List<?> result = redis.execute(
            LEAVE,
            List.of(key(LiveRedisKeys.viewers(liveId))),
            viewerKey
        );
        long remaining = asLong(result, 1);
        return new ViewerChange(remaining >= 0, asLong(result, 0), remaining == 0L);
    }

    @Override
    public long viewerCount(long liveId) {
        Long size = redis.opsForHash().size(key(LiveRedisKeys.viewers(liveId)));
        return size == null ? 0 : size;
    }

    @Override
    public long peakViewerCount(long liveId) {
        return parseLong(redis.opsForValue().get(key(LiveRedisKeys.peak(liveId))), 0);
    }

    @Override
    public long addLikes(long liveId, long userId, long count, long persistedLikeCount) {
        Long total = redis.execute(
            ADD_LIKES,
            List.of(key(LiveRedisKeys.likes(liveId)), key(LiveRedisKeys.pendingLikes(liveId))),
            Long.toString(userId),
            Long.toString(count),
            Long.toString(persistedLikeCount),
            Long.toString(ttl().toMillis())
        );
        return total == null ? persistedLikeCount : total;
    }

    @Override
    public long likeCount(long liveId, long persistedLikeCount) {
        String cached = redis.opsForValue().get(key(LiveRedisKeys.likes(liveId)));
        return Math.max(persistedLikeCount, parseLong(cached, persistedLikeCount));
    }

    @Override
    public Map<Long, CounterSnapshot> snapshot(Collection<Long> liveIds) {
        if (liveIds.isEmpty()) {
            return Map.of();
        }
        List<Long> ids = new ArrayList<>(liveIds);
        List<Object> results = redis.executePipelined((RedisCallback<Object>) connection -> {
            StringRedisConnection strings = (StringRedisConnection) connection;
            for (Long id : ids) {
                strings.hLen(key(LiveRedisKeys.viewers(id)));
                strings.get(key(LiveRedisKeys.likes(id)));
            }
            return null;
        });
        Map<Long, CounterSnapshot> snapshot = new LinkedHashMap<>();
        for (int index = 0; index < ids.size(); index++) {
            Object viewers = results.get(index * 2);
            Object likes = results.get(index * 2 + 1);
            long viewerCount = viewers instanceof Number number ? number.longValue() : 0;
            Long likeCount = likes == null ? null : parseLong(likes.toString(), 0);
            snapshot.put(ids.get(index), new CounterSnapshot(viewerCount, likeCount));
        }
        return snapshot;
    }

    @Override
    public Map<Long, Long> drainPendingLikes(long liveId) {
        List<?> flat = redis.execute(DRAIN, List.of(key(LiveRedisKeys.pendingLikes(liveId))));
        Map<Long, Long> drained = new HashMap<>();
        if (flat == null) {
            return drained;
        }
        for (int index = 0; index + 1 < flat.size(); index += 2) {
            long userId = parseLong(String.valueOf(flat.get(index)), -1);
            long count = parseLong(String.valueOf(flat.get(index + 1)), 0);
            if (userId > 0 && count > 0) {
                drained.merge(userId, count, Long::sum);
            }
        }
        return drained;
    }

    @Override
    public Set<Long> activeLiveIds() {
        Set<String> members = redis.opsForSet().members(key(LiveRedisKeys.ACTIVE_SET));
        if (members == null) {
            return Set.of();
        }
        return members.stream()
            .map(member -> parseLong(member, -1))
            .filter(id -> id > 0)
            .collect(Collectors.toSet());
    }

    @Override
    public long acquire(String bucket, long requested, long limit, Duration window) {
        if (requested <= 0) {
            return 0;
        }
        Long current = redis.execute(
            ACQUIRE,
            List.of(key(LiveRedisKeys.rateLimit(bucket))),
            Long.toString(requested),
            Long.toString(window.toMillis())
        );
        if (current == null) {
            return requested;
        }
        long before = current - requested;
        return Math.max(0, Math.min(requested, limit - before));
    }

    @Override
    public void clear(long liveId) {
        redis.delete(List.of(
            key(LiveRedisKeys.status(liveId)),
            key(LiveRedisKeys.viewers(liveId)),
            key(LiveRedisKeys.peak(liveId)),
            key(LiveRedisKeys.likes(liveId)),
            key(LiveRedisKeys.pendingLikes(liveId))
        ));
        redis.opsForSet().remove(key(LiveRedisKeys.ACTIVE_SET), Long.toString(liveId));
    }

    private String key(String suffix) {
        return redisProperties.prefixed(suffix);
    }

    private Duration ttl() {
        return Duration.ofHours(Math.max(1, liveProperties.getRealtime().getStateTtlHours()));
    }

    private static long asLong(List<?> values, int index) {
        if (values == null || values.size() <= index) {
            return 0;
        }
        Object value = values.get(index);
        return value instanceof Number number ? number.longValue() : parseLong(String.valueOf(value), 0);
    }

    private static long parseLong(String raw, long fallback) {
        if (raw == null) {
            return fallback;
        }
        try {
            return Long.parseLong(raw.trim());
        } catch (NumberFormatException ex) {
            return fallback;
        }
    }
}
