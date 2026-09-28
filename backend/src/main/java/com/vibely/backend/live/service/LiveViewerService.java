package com.vibely.backend.live.service;

import com.vibely.backend.live.dto.LiveUserResponse;
import com.vibely.backend.live.entity.Live;
import com.vibely.backend.live.entity.LiveViewer;
import com.vibely.backend.live.realtime.LiveCounterBroadcaster;
import com.vibely.backend.live.realtime.LiveEventPublisher;
import com.vibely.backend.live.realtime.LiveEventType;
import com.vibely.backend.live.realtime.LivePresenceRegistry;
import com.vibely.backend.live.realtime.LivePresenceRegistry.LivePresence;
import com.vibely.backend.live.realtime.LiveRealtimeStore;
import com.vibely.backend.live.realtime.LiveRealtimeStore.ViewerChange;
import com.vibely.backend.live.repository.LiveViewerRepository;
import com.vibely.backend.user.entity.User;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Viewer presence. Counts unique viewers (a user with several tabs counts once, the host never
 * counts); counters live in the realtime store and never go below zero.
 */
@Service
public class LiveViewerService {

    private static final Logger log = LoggerFactory.getLogger(LiveViewerService.class);

    private final LiveRealtimeStore store;
    private final LivePresenceRegistry registry;
    private final LiveCounterBroadcaster counterBroadcaster;
    private final LiveEventPublisher publisher;
    private final LiveViewerRepository viewerRepository;
    private final LiveResponseMapper mapper;

    public LiveViewerService(
        LiveRealtimeStore store,
        LivePresenceRegistry registry,
        LiveCounterBroadcaster counterBroadcaster,
        LiveEventPublisher publisher,
        LiveViewerRepository viewerRepository,
        LiveResponseMapper mapper
    ) {
        this.store = store;
        this.registry = registry;
        this.counterBroadcaster = counterBroadcaster;
        this.publisher = publisher;
        this.viewerRepository = viewerRepository;
        this.mapper = mapper;
    }

    /** Registers a subscription; returns false when the LIVE no longer accepts viewers. */
    public boolean joinLive(Live live, User viewer, String sessionId, String subscriptionId) {
        LiveUserResponse profile = mapper.toUser(viewer);
        boolean countable = !live.isHostedBy(viewer);
        boolean counted = false;
        if (countable) {
            ViewerChange change;
            try {
                change = store.join(live.getId(), viewer.getId());
            } catch (RuntimeException ex) {
                log.warn("live.viewer.join_failed live={} reason={}", live.getPublicId(), ex.getClass().getSimpleName());
                change = null;
            }
            if (change != null && !change.accepted()) {
                return false;
            }
            if (change != null) {
                counted = true;
                if (change.countChanged()) {
                    publisher.publish(live.getPublicId(), LiveEventType.USER_JOINED, profile);
                    counterBroadcaster.viewerCountChanged(live.getId(), live.getPublicId());
                }
            }
        }
        registry.add(new LivePresence(
            sessionId,
            subscriptionId,
            live.getId(),
            live.getPublicId(),
            viewer.getId(),
            profile,
            counted,
            LocalDateTime.now()
        ));
        return true;
    }

    public void leaveLive(String sessionId, String subscriptionId) {
        registry.remove(sessionId, subscriptionId).ifPresent(presence -> release(presence, LocalDateTime.now(), true));
    }

    public void leaveAll(String sessionId) {
        LocalDateTime now = LocalDateTime.now();
        for (LivePresence presence : registry.removeSession(sessionId)) {
            release(presence, now, true);
        }
    }

    /** Called once the LIVE is ENDED: the realtime state is being discarded, so only history is recorded. */
    public void onLiveEnded(long liveId, LocalDateTime endedAt) {
        List<LivePresence> presences = registry.removeLive(liveId);
        for (LivePresence presence : presences) {
            release(presence, endedAt, false);
        }
    }

    public long getViewerCount(long liveId) {
        try {
            return Math.max(0, store.viewerCount(liveId));
        } catch (RuntimeException ex) {
            log.warn("live.viewer.count_failed liveId={} reason={}", liveId, ex.getClass().getSimpleName());
            return 0;
        }
    }

    private void release(LivePresence presence, LocalDateTime leftAt, boolean updateCounters) {
        if (!presence.counted()) {
            return;
        }
        if (updateCounters) {
            try {
                ViewerChange change = store.leave(presence.liveId(), presence.userId());
                if (change.accepted() && change.countChanged()) {
                    publisher.publish(presence.livePublicId(), LiveEventType.USER_LEFT, presence.profile());
                    counterBroadcaster.viewerCountChanged(presence.liveId(), presence.livePublicId());
                }
            } catch (RuntimeException ex) {
                log.warn("live.viewer.leave_failed live={} reason={}", presence.livePublicId(), ex.getClass().getSimpleName());
            }
        }
        recordSession(presence, leftAt);
    }

    private void recordSession(LivePresence presence, LocalDateTime leftAt) {
        LocalDateTime end = leftAt.isBefore(presence.joinedAt()) ? presence.joinedAt() : leftAt;
        long seconds = Duration.between(presence.joinedAt(), end).toSeconds();
        try {
            viewerRepository.save(new LiveViewer(
                presence.liveId(),
                presence.userId(),
                presence.sessionId().length() > 64 ? presence.sessionId().substring(0, 64) : presence.sessionId(),
                presence.joinedAt(),
                end,
                seconds
            ));
        } catch (RuntimeException ex) {
            log.warn("live.viewer.record_failed live={} reason={}", presence.livePublicId(), ex.getClass().getSimpleName());
        }
    }
}
