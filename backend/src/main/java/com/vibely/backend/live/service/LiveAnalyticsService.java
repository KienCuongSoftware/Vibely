package com.vibely.backend.live.service;

import com.vibely.backend.live.dto.LiveAnalyticsResponse;
import com.vibely.backend.live.entity.Live;
import com.vibely.backend.live.entity.LiveAnalytics;
import com.vibely.backend.live.exception.LiveErrorCode;
import com.vibely.backend.live.exception.LiveException;
import com.vibely.backend.live.repository.LiveAnalyticsRepository;
import com.vibely.backend.live.repository.LiveCommentRepository;
import com.vibely.backend.live.repository.LiveMediaSessionRepository;
import com.vibely.backend.live.repository.LiveViewerRepository;
import com.vibely.backend.user.entity.User;
import java.time.Duration;
import java.time.LocalDateTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

/**
 * Post-LIVE statistics, computed once from data the LIVE already persists (viewer sessions with
 * watch time, counters snapshotted from Redis, comments, media session reconnects).
 */
@Service
public class LiveAnalyticsService {

    private static final Logger log = LoggerFactory.getLogger(LiveAnalyticsService.class);

    private final LiveAnalyticsRepository analyticsRepository;
    private final LiveViewerRepository viewerRepository;
    private final LiveCommentRepository commentRepository;
    private final LiveMediaSessionRepository sessionRepository;
    private final LiveActorResolver actorResolver;
    private final LiveAccessService accessService;

    public LiveAnalyticsService(
        LiveAnalyticsRepository analyticsRepository,
        LiveViewerRepository viewerRepository,
        LiveCommentRepository commentRepository,
        LiveMediaSessionRepository sessionRepository,
        LiveActorResolver actorResolver,
        LiveAccessService accessService
    ) {
        this.analyticsRepository = analyticsRepository;
        this.viewerRepository = viewerRepository;
        this.commentRepository = commentRepository;
        this.sessionRepository = sessionRepository;
        this.actorResolver = actorResolver;
        this.accessService = accessService;
    }

    /**
     * Called after the LIVE is ENDED and viewer sessions are flushed. Idempotent (one row per LIVE)
     * and never throws: statistics must not break ending a LIVE.
     */
    public void recordQuietly(Live ended, String endReason) {
        try {
            if (analyticsRepository.existsById(ended.getId())) {
                return;
            }
            analyticsRepository.saveAndFlush(compute(ended, endReason));
        } catch (DataIntegrityViolationException ex) {
            log.debug("live.analytics.already_recorded live={}", ended.getPublicId());
        } catch (RuntimeException ex) {
            log.warn("live.analytics.record_failed live={} reason={}", ended.getPublicId(), ex.getClass().getSimpleName());
        }
    }

    /** Host (or platform admin) only; available once the LIVE has ended. */
    public LiveAnalyticsResponse get(Authentication authentication, String liveId) {
        User actor = actorResolver.require(authentication);
        Live live = accessService.requireExisting(liveId);
        if (!live.isHostedBy(actor) && !LiveAccessService.isAdmin(actor)) {
            throw new LiveException(LiveErrorCode.LIVE_NOT_FOUND);
        }
        if (!live.getStatus().isFinished()) {
            throw new LiveException(LiveErrorCode.INVALID_LIVE_STATE, "Analytics are available after the LIVE ends");
        }
        LiveAnalytics analytics = analyticsRepository.findById(live.getId())
            .orElseGet(() -> compute(live, null));
        return LiveAnalyticsResponse.from(live.getPublicId(), analytics);
    }

    LiveAnalytics compute(Live live, String endReason) {
        long duration = 0;
        if (live.getStartedAt() != null) {
            LocalDateTime end = live.getEndedAt() != null ? live.getEndedAt() : LocalDateTime.now();
            duration = Math.max(0, Duration.between(live.getStartedAt(), end).getSeconds());
        }
        long uniqueViewers = viewerRepository.countDistinctUsers(live.getId())
            + viewerRepository.countGuestSessions(live.getId());
        long watchSeconds = viewerRepository.sumWatchSeconds(live.getId());
        long comments = commentRepository.countByLive_IdAndDeletedAtIsNull(live.getId());
        int reconnects = sessionRepository.findByLiveId(live.getId())
            .map(session -> Math.max(0, session.getPublishCount() - 1))
            .orElse(0);
        return new LiveAnalytics(
            live.getId(),
            duration,
            uniqueViewers,
            watchSeconds,
            live.getPeakViewerCount(),
            live.getLikeCount(),
            comments,
            reconnects,
            endReason,
            LocalDateTime.now()
        );
    }
}
