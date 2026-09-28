package com.vibely.backend.live.realtime;

import java.util.Iterator;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Coalesces VIEWER_COUNT_UPDATED / LIKE_UPDATED so a burst of joins or taps produces at most one
 * event per LIVE per {@code live.realtime.broadcast-interval-ms}.
 */
@Component
public class LiveCounterBroadcaster {

    private static final Logger log = LoggerFactory.getLogger(LiveCounterBroadcaster.class);

    private final LiveRealtimeStore store;
    private final LiveEventPublisher publisher;
    private final Map<Long, UUID> dirtyViewers = new ConcurrentHashMap<>();
    private final Map<Long, UUID> dirtyLikes = new ConcurrentHashMap<>();

    public LiveCounterBroadcaster(LiveRealtimeStore store, LiveEventPublisher publisher) {
        this.store = store;
        this.publisher = publisher;
    }

    public void viewerCountChanged(long liveId, UUID publicId) {
        dirtyViewers.put(liveId, publicId);
    }

    public void likeCountChanged(long liveId, UUID publicId) {
        dirtyLikes.put(liveId, publicId);
    }

    public void forget(long liveId) {
        dirtyViewers.remove(liveId);
        dirtyLikes.remove(liveId);
    }

    @Scheduled(fixedDelayString = "${live.realtime.broadcast-interval-ms:1000}")
    public void flush() {
        drain(dirtyViewers, (liveId, publicId) -> publisher.publish(
            publicId,
            LiveEventType.VIEWER_COUNT_UPDATED,
            Map.of("viewerCount", store.viewerCount(liveId))
        ));
        drain(dirtyLikes, (liveId, publicId) -> publisher.publish(
            publicId,
            LiveEventType.LIKE_UPDATED,
            Map.of("likeCount", store.likeCount(liveId, 0))
        ));
    }

    private void drain(Map<Long, UUID> dirty, java.util.function.BiConsumer<Long, UUID> action) {
        Iterator<Map.Entry<Long, UUID>> iterator = dirty.entrySet().iterator();
        while (iterator.hasNext()) {
            Map.Entry<Long, UUID> entry = iterator.next();
            iterator.remove();
            try {
                action.accept(entry.getKey(), entry.getValue());
            } catch (RuntimeException ex) {
                log.warn("live.counter.broadcast_failed live={} reason={}", entry.getValue(), ex.getClass().getSimpleName());
            }
        }
    }
}
