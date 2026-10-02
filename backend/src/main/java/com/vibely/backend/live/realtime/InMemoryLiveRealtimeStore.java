package com.vibely.backend.live.realtime;

import java.time.Duration;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/** Single-node fallback used when Redis is disabled (local runs, tests); same semantics as the Redis store. */
@Component
@ConditionalOnProperty(name = "app.redis.enabled", havingValue = "false", matchIfMissing = true)
public class InMemoryLiveRealtimeStore implements LiveRealtimeStore {

    private final Map<Long, LiveState> lives = new ConcurrentHashMap<>();
    private final Map<String, Window> buckets = new ConcurrentHashMap<>();

    @Override
    public void activate(long liveId) {
        LiveState state = state(liveId);
        synchronized (state) {
            state.active = true;
        }
    }

    @Override
    public void deactivate(long liveId) {
        LiveState state = lives.get(liveId);
        if (state == null) {
            return;
        }
        synchronized (state) {
            state.active = false;
        }
    }

    @Override
    public boolean isActive(long liveId) {
        LiveState state = lives.get(liveId);
        if (state == null) {
            return false;
        }
        synchronized (state) {
            return state.active;
        }
    }

    @Override
    public void touch(long liveId) {
        // No TTLs in memory.
    }

    @Override
    public ViewerChange join(long liveId, String viewerId) {
        LiveState state = lives.get(liveId);
        if (state == null) {
            return ViewerChange.rejected();
        }
        synchronized (state) {
            if (!state.active) {
                return ViewerChange.rejected();
            }
            long connections = state.viewers.merge(viewerId, 1L, Long::sum);
            long count = state.viewers.size();
            state.peak = Math.max(state.peak, count);
            return new ViewerChange(true, count, connections == 1L);
        }
    }

    @Override
    public ViewerChange leave(long liveId, String viewerId) {
        LiveState state = lives.get(liveId);
        if (state == null) {
            return new ViewerChange(false, 0, false);
        }
        synchronized (state) {
            Long current = state.viewers.get(viewerId);
            if (current == null || current <= 0) {
                return new ViewerChange(false, state.viewers.size(), false);
            }
            long remaining = current - 1;
            if (remaining <= 0) {
                state.viewers.remove(viewerId);
            } else {
                state.viewers.put(viewerId, remaining);
            }
            return new ViewerChange(true, state.viewers.size(), remaining <= 0);
        }
    }

    @Override
    public long viewerCount(long liveId) {
        LiveState state = lives.get(liveId);
        if (state == null) {
            return 0;
        }
        synchronized (state) {
            return state.viewers.size();
        }
    }

    @Override
    public long peakViewerCount(long liveId) {
        LiveState state = lives.get(liveId);
        if (state == null) {
            return 0;
        }
        synchronized (state) {
            return state.peak;
        }
    }

    @Override
    public long addLikes(long liveId, long userId, long count, long persistedLikeCount) {
        LiveState state = state(liveId);
        synchronized (state) {
            if (state.likes == null) {
                state.likes = persistedLikeCount;
            }
            state.likes += count;
            state.pendingLikes.merge(userId, count, Long::sum);
            return state.likes;
        }
    }

    @Override
    public long likeCount(long liveId, long persistedLikeCount) {
        LiveState state = lives.get(liveId);
        if (state == null) {
            return persistedLikeCount;
        }
        synchronized (state) {
            return state.likes == null ? persistedLikeCount : Math.max(state.likes, persistedLikeCount);
        }
    }

    @Override
    public Map<Long, CounterSnapshot> snapshot(Collection<Long> liveIds) {
        Map<Long, CounterSnapshot> snapshot = new LinkedHashMap<>();
        for (Long liveId : liveIds) {
            LiveState state = lives.get(liveId);
            if (state == null) {
                snapshot.put(liveId, new CounterSnapshot(0, null));
                continue;
            }
            synchronized (state) {
                snapshot.put(liveId, new CounterSnapshot(state.viewers.size(), state.likes));
            }
        }
        return snapshot;
    }

    @Override
    public Map<Long, Long> drainPendingLikes(long liveId) {
        LiveState state = lives.get(liveId);
        if (state == null) {
            return Map.of();
        }
        synchronized (state) {
            Map<Long, Long> drained = new HashMap<>(state.pendingLikes);
            state.pendingLikes.clear();
            return drained;
        }
    }

    @Override
    public Set<Long> activeLiveIds() {
        return lives.entrySet().stream()
            .filter(entry -> {
                synchronized (entry.getValue()) {
                    return entry.getValue().active;
                }
            })
            .map(Map.Entry::getKey)
            .collect(java.util.stream.Collectors.toSet());
    }

    @Override
    public long acquire(String bucket, long requested, long limit, Duration window) {
        if (requested <= 0) {
            return 0;
        }
        long now = System.currentTimeMillis();
        Window counter = buckets.computeIfAbsent(bucket, ignored -> new Window(now));
        synchronized (counter) {
            if (now - counter.startedAt >= window.toMillis()) {
                counter.startedAt = now;
                counter.used = 0;
            }
            long granted = Math.max(0, Math.min(requested, limit - counter.used));
            counter.used += requested;
            return granted;
        }
    }

    @Override
    public void clear(long liveId) {
        lives.remove(liveId);
    }

    private LiveState state(long liveId) {
        return lives.computeIfAbsent(liveId, ignored -> new LiveState());
    }

    private static final class LiveState {
        private boolean active;
        private final Map<String, Long> viewers = new HashMap<>();
        private long peak;
        private Long likes;
        private final Map<Long, Long> pendingLikes = new HashMap<>();
    }

    private static final class Window {
        private long startedAt;
        private long used;

        private Window(long startedAt) {
            this.startedAt = startedAt;
        }
    }
}
