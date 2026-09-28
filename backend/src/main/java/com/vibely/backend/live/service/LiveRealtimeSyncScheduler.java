package com.vibely.backend.live.service;

import com.vibely.backend.live.entity.LiveStatus;
import com.vibely.backend.live.realtime.LiveCounterBroadcaster;
import com.vibely.backend.live.realtime.LiveRealtimeStore;
import com.vibely.backend.live.repository.LiveRepository;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Periodically snapshots realtime counters into PostgreSQL (never per event), flushes like tallies,
 * refreshes Redis TTLs and reconciles the store with the database after restarts.
 */
@Component
public class LiveRealtimeSyncScheduler {

    private static final Logger log = LoggerFactory.getLogger(LiveRealtimeSyncScheduler.class);

    private final LiveRealtimeStore store;
    private final LiveRepository liveRepository;
    private final LiveLikeService likeService;
    private final LiveCounterBroadcaster counterBroadcaster;

    public LiveRealtimeSyncScheduler(
        LiveRealtimeStore store,
        LiveRepository liveRepository,
        LiveLikeService likeService,
        LiveCounterBroadcaster counterBroadcaster
    ) {
        this.store = store;
        this.liveRepository = liveRepository;
        this.likeService = likeService;
        this.counterBroadcaster = counterBroadcaster;
    }

    @Scheduled(
        initialDelayString = "${live.realtime.persist-interval-ms:15000}",
        fixedDelayString = "${live.realtime.persist-interval-ms:15000}"
    )
    public void sync() {
        Set<Long> active;
        List<Long> liveInDatabase;
        try {
            active = new HashSet<>(store.activeLiveIds());
            liveInDatabase = liveRepository.findIdsByStatus(LiveStatus.LIVE);
        } catch (RuntimeException ex) {
            log.warn("live.sync.skipped reason={}", ex.getClass().getSimpleName());
            return;
        }

        for (Long liveId : liveInDatabase) {
            if (!active.contains(liveId)) {
                // Realtime state was lost (Redis/app restart) while the LIVE is still broadcasting.
                safely(liveId, () -> store.activate(liveId));
                active.add(liveId);
            }
        }

        Set<Long> stillLive = new HashSet<>(liveInDatabase);
        for (Long liveId : active) {
            safely(liveId, () -> {
                long viewers = store.viewerCount(liveId);
                long peak = store.peakViewerCount(liveId);
                long likes = store.likeCount(liveId, 0);
                int updated = stillLive.contains(liveId)
                    ? liveRepository.updateRealtimeStats(liveId, viewers, peak, likes)
                    : 0;
                likeService.flushLikeCount(liveId);
                if (updated == 0) {
                    // Ended elsewhere (other node, crash mid-end): drop the orphaned realtime state.
                    store.clear(liveId);
                    counterBroadcaster.forget(liveId);
                } else {
                    store.touch(liveId);
                }
            });
        }
    }

    private void safely(Long liveId, Runnable action) {
        try {
            action.run();
        } catch (RuntimeException ex) {
            log.warn("live.sync.failed liveId={} reason={}", liveId, ex.getClass().getSimpleName());
        }
    }
}
