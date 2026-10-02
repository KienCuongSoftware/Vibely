package com.vibely.backend.live.service;

import com.vibely.backend.live.config.LiveProperties;
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
 * counts); counters live in the realtime store and never go below zero. Without a media server the
 * STOMP subscription is the viewer signal; with SRS enabled only actual WebRTC playback counts.
 */
@Service
public class LiveViewerService {

    private static final Logger log = LoggerFactory.getLogger(LiveViewerService.class);
    private static final String MEDIA_SESSION_PREFIX = "srs:";
    private static final String MEDIA_SUBSCRIPTION = "play";

    private final LiveRealtimeStore store;
    private final LivePresenceRegistry registry;
    private final LiveCounterBroadcaster counterBroadcaster;
    private final LiveEventPublisher publisher;
    private final LiveViewerRepository viewerRepository;
    private final LiveResponseMapper mapper;
    private final boolean mediaEnabled;

    public LiveViewerService(
        LiveRealtimeStore store,
        LivePresenceRegistry registry,
        LiveCounterBroadcaster counterBroadcaster,
        LiveEventPublisher publisher,
        LiveViewerRepository viewerRepository,
        LiveResponseMapper mapper,
        LiveProperties properties
    ) {
        this.store = store;
        this.registry = registry;
        this.counterBroadcaster = counterBroadcaster;
        this.publisher = publisher;
        this.viewerRepository = viewerRepository;
        this.mapper = mapper;
        this.mediaEnabled = properties.getMedia().isEnabled();
    }

    /**
     * Registers a STOMP subscription; returns false when the LIVE no longer accepts viewers.
     * With real media enabled a chat subscription is not a viewer (only SRS playback is counted).
     */
    public boolean joinLive(Live live, User viewer, String sessionId, String subscriptionId) {
        boolean countable = !mediaEnabled && !live.isHostedBy(viewer);
        return join(live, LiveRealtimeStore.userKey(viewer.getId()), viewer.getId(), mapper.toUser(viewer), countable, sessionId, subscriptionId);
    }

    /**
     * Counts an SRS playback client (on_play hook). Idempotent per {@code clientId}: SRS retrying the
     * hook or a duplicate notification never takes a second slot. The host watching their own LIVE is
     * not counted.
     */
    public boolean joinMediaViewer(Live live, String clientId, String viewerKey, User viewer) {
        String sessionId = mediaSessionId(clientId);
        if (registry.contains(sessionId)) {
            return true;
        }
        boolean countable = viewer == null || !live.isHostedBy(viewer);
        LiveUserResponse profile = viewer == null ? null : mapper.toUser(viewer);
        Long userId = viewer == null ? null : viewer.getId();
        return join(live, viewerKey, userId, profile, countable, sessionId, MEDIA_SUBSCRIPTION);
    }

    /** Releases an SRS playback client (on_stop hook); unknown clients are a no-op. */
    public void leaveMediaViewer(String clientId) {
        leaveAll(mediaSessionId(clientId));
    }

    /** SRS client ids through which the user is currently watching the LIVE. */
    public List<String> mediaClientIds(long liveId, long userId) {
        return registry.findSessions(MEDIA_SESSION_PREFIX, liveId, userId).stream()
            .map(sessionId -> sessionId.substring(MEDIA_SESSION_PREFIX.length()))
            .toList();
    }

    /** SRS restarted: every playback client it knew about is gone. */
    public void releaseAllMediaViewers() {
        LocalDateTime now = LocalDateTime.now();
        for (LivePresence presence : registry.removeSessionsWithPrefix(MEDIA_SESSION_PREFIX)) {
            release(presence, now, true);
        }
    }

    private boolean join(
        Live live,
        String viewerKey,
        Long userId,
        LiveUserResponse profile,
        boolean countable,
        String sessionId,
        String subscriptionId
    ) {
        boolean counted = false;
        if (countable) {
            ViewerChange change;
            try {
                change = store.join(live.getId(), viewerKey);
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
                    if (profile != null) {
                        publisher.publish(live.getPublicId(), LiveEventType.USER_JOINED, profile);
                    }
                    counterBroadcaster.viewerCountChanged(live.getId(), live.getPublicId());
                }
            }
        }
        registry.add(new LivePresence(
            sessionId,
            subscriptionId,
            live.getId(),
            live.getPublicId(),
            viewerKey,
            userId,
            profile,
            counted,
            LocalDateTime.now()
        ));
        return true;
    }

    private static String mediaSessionId(String clientId) {
        return MEDIA_SESSION_PREFIX + clientId;
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
                ViewerChange change = store.leave(presence.liveId(), presence.viewerKey());
                if (change.accepted() && change.countChanged()) {
                    if (presence.profile() != null) {
                        publisher.publish(presence.livePublicId(), LiveEventType.USER_LEFT, presence.profile());
                    }
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
