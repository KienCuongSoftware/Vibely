package com.vibely.backend.live.media;

import com.vibely.backend.live.config.LiveProperties;
import com.vibely.backend.live.entity.LiveMediaSession;
import com.vibely.backend.live.entity.LiveMediaSessionStatus;
import com.vibely.backend.live.entity.LiveStatus;
import com.vibely.backend.live.realtime.LiveEventPublisher;
import com.vibely.backend.live.realtime.LiveEventType;
import com.vibely.backend.live.repository.LiveMediaSessionRepository;
import com.vibely.backend.live.repository.LiveRepository;
import com.vibely.backend.live.service.LiveService;
import com.vibely.backend.live.service.LiveViewerService;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Reconciles media sessions with what SRS actually has, because hooks alone are not enough: a host
 * whose network drops is only noticed by SRS after its STUN timeout, SRS may restart, and hooks can
 * be lost. Policy:
 * <ul>
 *   <li>PUBLISHING but SRS has no active stream: INTERRUPTED (the reconnect grace period starts).</li>
 *   <li>INTERRUPTED but SRS still has the same publisher: back to PUBLISHING (stale notification).</li>
 *   <li>INTERRUPTED longer than the grace period: the LIVE is ended ({@code host_disconnected}).</li>
 *   <li>PENDING longer than the start timeout: the LIVE is ended ({@code publish_timeout}).</li>
 *   <li>ENDED sessions whose SRS cleanup failed are retried for a bounded time.</li>
 * </ul>
 * A single packet loss never ends a LIVE: only a sustained absence beyond the configured grace does.
 */
@Component
@ConditionalOnProperty(name = "live.media.enabled", havingValue = "true")
public class LiveMediaHealthScheduler {

    private static final Logger log = LoggerFactory.getLogger(LiveMediaHealthScheduler.class);
    /** A publish accepted moments before the snapshot may not be listed by SRS yet. */
    private static final long SNAPSHOT_GRACE_SECONDS = 3;
    /** Consecutive unreachable checks before publishing sessions are treated as interrupted. */
    private static final int UNREACHABLE_THRESHOLD = 2;

    private final LiveMediaSessionRepository sessionRepository;
    private final LiveRepository liveRepository;
    private final SrsClient srsClient;
    private final SrsLiveMediaService mediaService;
    private final LiveService liveService;
    private final LiveViewerService viewerService;
    private final LiveEventPublisher publisher;
    private final LiveMediaMetrics metrics;
    private final LiveProperties.Media config;

    private String lastServerId;
    private int consecutiveFailures;

    public LiveMediaHealthScheduler(
        LiveMediaSessionRepository sessionRepository,
        LiveRepository liveRepository,
        SrsClient srsClient,
        SrsLiveMediaService mediaService,
        LiveService liveService,
        LiveViewerService viewerService,
        LiveEventPublisher publisher,
        LiveMediaMetrics metrics,
        LiveProperties properties
    ) {
        this.sessionRepository = sessionRepository;
        this.liveRepository = liveRepository;
        this.srsClient = srsClient;
        this.mediaService = mediaService;
        this.liveService = liveService;
        this.viewerService = viewerService;
        this.publisher = publisher;
        this.metrics = metrics;
        this.config = properties.getMedia();
    }

    @Scheduled(
        initialDelayString = "${live.media.health-check-interval-ms:5000}",
        fixedDelayString = "${live.media.health-check-interval-ms:5000}"
    )
    public void check() {
        try {
            reconcile();
        } catch (RuntimeException ex) {
            log.warn("live.media.health.failed reason={}", ex.getClass().getSimpleName());
        }
    }

    synchronized void reconcile() {
        List<LiveMediaSession> open = sessionRepository.findByStatusIn(
            EnumSet.of(LiveMediaSessionStatus.PENDING, LiveMediaSessionStatus.PUBLISHING, LiveMediaSessionStatus.INTERRUPTED)
        );
        LocalDateTime snapshotAt = LocalDateTime.now();
        SrsClient.StreamsSnapshot snapshot = fetchSnapshot();

        int publishing = 0;
        for (LiveMediaSession session : open) {
            try {
                if (reconcileSession(session, snapshot, snapshotAt)) {
                    publishing++;
                }
            } catch (RuntimeException ex) {
                log.warn("live.media.health.session_failed session={} reason={}", session.getId(), ex.getClass().getSimpleName());
            }
        }
        metrics.setActiveStreams(publishing);

        if (snapshot != null) {
            retryCleanup();
        }
    }

    /** @return whether the session is (still) publishing */
    private boolean reconcileSession(LiveMediaSession session, SrsClient.StreamsSnapshot snapshot, LocalDateTime snapshotAt) {
        LocalDateTime now = LocalDateTime.now();
        boolean broadcasting = liveRepository.findById(session.getLiveId())
            .map(live -> live.getStatus() == LiveStatus.LIVE)
            .orElse(false);
        if (!broadcasting) {
            // The LIVE ended but its media session was not closed (e.g. a failure mid-end).
            liveService.endBySystem(session.getLiveId(), LiveService.END_REASON_HOST);
            return false;
        }
        SrsClient.SrsStream stream = snapshot == null ? null : snapshot.streams().get(session.getStreamName());
        boolean active = stream != null && stream.active();
        boolean srsDown = snapshot == null && consecutiveFailures >= UNREACHABLE_THRESHOLD;

        switch (session.getStatus()) {
            case PUBLISHING -> {
                boolean recentlyPublished = session.getLastPublishedAt() != null
                    && session.getLastPublishedAt().isAfter(snapshotAt.minusSeconds(SNAPSHOT_GRACE_SECONDS));
                if ((snapshot != null && !active && !recentlyPublished) || srsDown) {
                    if (sessionRepository.markInterrupted(session.getId(), null, now) > 0) {
                        announceInterrupted(session, srsDown ? "media_server_unreachable" : "stream_missing");
                    }
                    return false;
                }
                return true;
            }
            case INTERRUPTED -> {
                if (active && stream.publisherClientId() != null
                    && stream.publisherClientId().equals(session.getPublisherClientId())
                    && sessionRepository.markRecovered(session.getId(), stream.publisherClientId()) > 0) {
                    announcePublishing(session);
                    log.info("live.media.publish_recovered session={}", session.getId());
                    return true;
                }
                LocalDateTime since = session.getDisconnectedAt() == null ? session.getCreatedAt() : session.getDisconnectedAt();
                if (since.plusSeconds(config.getReconnectGraceSeconds()).isBefore(now)) {
                    log.info("live.media.reconnect_grace_expired session={} liveId={}", session.getId(), session.getLiveId());
                    liveService.endBySystem(session.getLiveId(), LiveService.END_REASON_HOST_DISCONNECTED);
                }
                return false;
            }
            case PENDING -> {
                if (session.getCreatedAt().plusSeconds(config.getPublishStartTimeoutSeconds()).isBefore(now)) {
                    log.info("live.media.publish_start_timeout session={} liveId={}", session.getId(), session.getLiveId());
                    liveService.endBySystem(session.getLiveId(), LiveService.END_REASON_PUBLISH_TIMEOUT);
                }
                return false;
            }
            default -> {
                return false;
            }
        }
    }

    private SrsClient.StreamsSnapshot fetchSnapshot() {
        try {
            SrsClient.StreamsSnapshot snapshot = srsClient.listStreams();
            if (consecutiveFailures > 0) {
                log.info("live.media.srs_reachable again after {} failed checks", consecutiveFailures);
            }
            consecutiveFailures = 0;
            if (lastServerId != null && snapshot.serverId() != null && !lastServerId.equals(snapshot.serverId())) {
                // SRS restarted: every player it had is gone without on_stop hooks.
                log.warn("live.media.srs_restarted");
                viewerService.releaseAllMediaViewers();
            }
            if (snapshot.serverId() != null) {
                lastServerId = snapshot.serverId();
            }
            return snapshot;
        } catch (SrsUnavailableException ex) {
            consecutiveFailures++;
            if (consecutiveFailures == 1 || consecutiveFailures % 12 == 0) {
                log.warn("live.media.srs_unreachable failures={} reason={}", consecutiveFailures, ex.getMessage());
            }
            if (consecutiveFailures == UNREACHABLE_THRESHOLD) {
                viewerService.releaseAllMediaViewers();
            }
            return null;
        }
    }

    private void retryCleanup() {
        LocalDateTime giveUpBefore = LocalDateTime.now().minusMinutes(Math.max(1, config.getCleanupRetryMinutes()));
        for (LiveMediaSession session : sessionRepository.findByCleanupPendingTrue()) {
            if (session.getEndedAt() != null && session.getEndedAt().isBefore(giveUpBefore)) {
                sessionRepository.markCleanedUp(session.getId());
                log.error("live.media.cleanup_abandoned session={} endedAt={}", session.getId(), session.getEndedAt());
                continue;
            }
            mediaService.cleanupQuietly(session);
        }
    }

    private void announceInterrupted(LiveMediaSession session, String reason) {
        Instant deadline = Instant.now().plusSeconds(config.getReconnectGraceSeconds());
        log.info("live.media.publish_interrupted session={} reason={} graceSeconds={}", session.getId(), reason, config.getReconnectGraceSeconds());
        publishState(session, false, deadline);
    }

    private void announcePublishing(LiveMediaSession session) {
        publishState(session, true, null);
    }

    private void publishState(LiveMediaSession session, boolean publishing, Instant reconnectDeadline) {
        liveRepository.findPublicIdById(session.getLiveId()).ifPresent(publicId -> {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("publishing", publishing);
            payload.put("reconnectDeadline", reconnectDeadline);
            publisher.publish(publicId, LiveEventType.STREAM_STATE_UPDATED, payload);
        });
    }
}
