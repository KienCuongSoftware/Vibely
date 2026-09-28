package com.vibely.backend.live.service;

import com.vibely.backend.live.config.LiveProperties;
import com.vibely.backend.live.dto.LiveLikeResponse;
import com.vibely.backend.live.entity.Live;
import com.vibely.backend.live.entity.LiveLike;
import com.vibely.backend.live.entity.LiveStatus;
import com.vibely.backend.live.exception.LiveErrorCode;
import com.vibely.backend.live.exception.LiveException;
import com.vibely.backend.live.realtime.LiveCounterBroadcaster;
import com.vibely.backend.live.realtime.LiveRealtimeStore;
import com.vibely.backend.live.repository.LiveLikeRepository;
import com.vibely.backend.user.entity.User;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Likes are counted in the realtime store (atomic INCRBY) and flushed to PostgreSQL in batches:
 * {@code lives.like_count} by the periodic snapshot and per-user tallies into {@code live_likes}.
 */
@Service
public class LiveLikeService {

    private static final Logger log = LoggerFactory.getLogger(LiveLikeService.class);

    private final LiveActorResolver actorResolver;
    private final LiveAccessService accessService;
    private final LiveRealtimeStore store;
    private final LiveCounterBroadcaster counterBroadcaster;
    private final LiveLikeRepository likeRepository;
    private final LiveProperties properties;
    private final TransactionTemplate transactionTemplate;

    public LiveLikeService(
        LiveActorResolver actorResolver,
        LiveAccessService accessService,
        LiveRealtimeStore store,
        LiveCounterBroadcaster counterBroadcaster,
        LiveLikeRepository likeRepository,
        LiveProperties properties,
        PlatformTransactionManager transactionManager
    ) {
        this.actorResolver = actorResolver;
        this.accessService = accessService;
        this.store = store;
        this.counterBroadcaster = counterBroadcaster;
        this.likeRepository = likeRepository;
        this.properties = properties;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    public LiveLikeResponse like(Authentication authentication, String liveId, Integer requestedCount) {
        User user = actorResolver.require(authentication);
        Live live = accessService.requireViewable(liveId, user);
        if (live.getStatus() != LiveStatus.LIVE || !store.isActive(live.getId())) {
            throw new LiveException(LiveErrorCode.LIVE_NOT_ACTIVE);
        }
        int count = requestedCount == null ? 1 : requestedCount;
        if (count <= 0) {
            throw new LiveException(LiveErrorCode.INVALID_LIKE_COUNT);
        }
        count = Math.min(count, Math.max(1, properties.getLike().getMaxPerRequest()));

        LiveProperties.LikeRateLimit limit = properties.getLike().getRateLimit();
        long granted = store.acquire(
            "like:" + live.getId() + ":" + user.getId(),
            count,
            limit.getMaxLikes(),
            Duration.ofSeconds(Math.max(1, limit.getWindowSeconds()))
        );
        if (granted <= 0) {
            return new LiveLikeResponse(getLikeCount(live), 0);
        }
        long total = store.addLikes(live.getId(), user.getId(), granted, live.getLikeCount());
        counterBroadcaster.likeCountChanged(live.getId(), live.getPublicId());
        return new LiveLikeResponse(total, granted);
    }

    public long getLikeCount(Live live) {
        if (live.getStatus() != LiveStatus.LIVE) {
            return live.getLikeCount();
        }
        try {
            return store.likeCount(live.getId(), live.getLikeCount());
        } catch (RuntimeException ex) {
            return live.getLikeCount();
        }
    }

    /** Moves pending per-user tallies from the realtime store into {@code live_likes}. */
    public void flushLikeCount(long liveId) {
        Map<Long, Long> pending;
        try {
            pending = store.drainPendingLikes(liveId);
        } catch (RuntimeException ex) {
            log.warn("live.like.drain_failed liveId={} reason={}", liveId, ex.getClass().getSimpleName());
            return;
        }
        LocalDateTime now = LocalDateTime.now();
        pending.forEach((userId, delta) -> {
            try {
                upsert(liveId, userId, delta, now);
            } catch (RuntimeException ex) {
                log.warn("live.like.flush_failed liveId={} userId={} reason={}", liveId, userId, ex.getClass().getSimpleName());
            }
        });
    }

    private void upsert(long liveId, long userId, long delta, LocalDateTime now) {
        Integer updated = transactionTemplate.execute(status -> likeRepository.increment(liveId, userId, delta, now));
        if (updated != null && updated > 0) {
            return;
        }
        try {
            transactionTemplate.executeWithoutResult(status -> likeRepository.save(new LiveLike(liveId, userId, delta)));
        } catch (DataIntegrityViolationException raced) {
            transactionTemplate.execute(status -> likeRepository.increment(liveId, userId, delta, now));
        }
    }
}
