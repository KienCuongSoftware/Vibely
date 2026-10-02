package com.vibely.backend.live.service;

import com.vibely.backend.common.BadRequestException;
import com.vibely.backend.common.SqlSafe;
import com.vibely.backend.common.UnauthorizedException;
import com.vibely.backend.interaction.repository.FollowRepository;
import com.vibely.backend.live.config.LiveProperties;
import com.vibely.backend.live.dto.CreateLiveRequest;
import com.vibely.backend.live.dto.LivePageResponse;
import com.vibely.backend.live.dto.LiveResponse;
import com.vibely.backend.live.dto.LiveStatsResponse;
import com.vibely.backend.live.dto.UpdateLiveRequest;
import com.vibely.backend.live.entity.Live;
import com.vibely.backend.live.entity.LiveCategory;
import com.vibely.backend.live.entity.LiveStatus;
import com.vibely.backend.live.entity.LiveVisibility;
import com.vibely.backend.live.exception.LiveErrorCode;
import com.vibely.backend.live.exception.LiveException;
import com.vibely.backend.live.media.LiveMediaService;
import com.vibely.backend.live.media.dto.LivePlaybackResponse;
import com.vibely.backend.live.media.dto.LivePublishCredentialResponse;
import com.vibely.backend.live.realtime.LiveCounterBroadcaster;
import com.vibely.backend.live.realtime.LiveEventPublisher;
import com.vibely.backend.live.realtime.LiveEventType;
import com.vibely.backend.live.realtime.LiveRealtimeStore;
import com.vibely.backend.live.realtime.LiveRealtimeStore.CounterSnapshot;
import com.vibely.backend.live.repository.LiveRepository;
import com.vibely.backend.storage.S3OwnedMediaValidator;
import com.vibely.backend.user.entity.User;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.Sort;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * LIVE lifecycle, metadata and discovery. State transitions are single conditional UPDATEs
 * (WHERE status = expected), so concurrent start/end requests cannot both succeed.
 */
@Service
public class LiveService {

    private static final Logger log = LoggerFactory.getLogger(LiveService.class);

    public static final String END_REASON_HOST = "host";
    public static final String END_REASON_ADMIN = "admin";
    public static final String END_REASON_HOST_DISCONNECTED = "host_disconnected";
    public static final String END_REASON_PUBLISH_TIMEOUT = "publish_timeout";

    private final LiveRepository liveRepository;
    private final FollowRepository followRepository;
    private final LiveActorResolver actorResolver;
    private final LiveAccessService accessService;
    private final LiveRealtimeStore store;
    private final LiveViewerService viewerService;
    private final LiveLikeService likeService;
    private final LiveCounterBroadcaster counterBroadcaster;
    private final LiveEventPublisher publisher;
    private final LiveResponseMapper mapper;
    private final S3OwnedMediaValidator mediaValidator;
    private final LiveProperties properties;
    private final LiveMediaService mediaService;
    private final LiveCategoryClassifier categoryClassifier;

    public LiveService(
        LiveRepository liveRepository,
        FollowRepository followRepository,
        LiveActorResolver actorResolver,
        LiveAccessService accessService,
        LiveRealtimeStore store,
        LiveViewerService viewerService,
        LiveLikeService likeService,
        LiveCounterBroadcaster counterBroadcaster,
        LiveEventPublisher publisher,
        LiveResponseMapper mapper,
        S3OwnedMediaValidator mediaValidator,
        LiveProperties properties,
        LiveMediaService mediaService,
        LiveCategoryClassifier categoryClassifier
    ) {
        this.mediaService = mediaService;
        this.categoryClassifier = categoryClassifier;
        this.liveRepository = liveRepository;
        this.followRepository = followRepository;
        this.actorResolver = actorResolver;
        this.accessService = accessService;
        this.store = store;
        this.viewerService = viewerService;
        this.likeService = likeService;
        this.counterBroadcaster = counterBroadcaster;
        this.publisher = publisher;
        this.mapper = mapper;
        this.mediaValidator = mediaValidator;
        this.properties = properties;
    }

    public LiveResponse create(Authentication authentication, CreateLiveRequest request) {
        User host = actorResolver.require(authentication);
        Live live = new Live();
        live.setHost(host);
        live.setTitle(requireTitle(request.title()));
        live.setDescription(trimToNull(request.description()));
        live.setCategory(StringUtils.hasText(request.category())
            ? parseCategory(request.category())
            : categoryClassifier.classify(live.getTitle(), live.getDescription()));
        live.setCoverUrl(validatedCover(request.coverUrl(), host));
        live.setVisibility(request.visibility() == null ? LiveVisibility.PUBLIC : parseVisibility(request.visibility()));
        live.setAllowComments(request.allowComments() == null || request.allowComments());
        live.setAllowGifts(request.allowGifts() == null || request.allowGifts());
        live.setAllowGuests(Boolean.TRUE.equals(request.allowGuests()));
        live.setMatureContent(Boolean.TRUE.equals(request.matureContent()));

        Live saved = liveRepository.save(live);
        log.info("live.created live={} hostId={}", saved.getPublicId(), host.getId());
        return toDetail(reload(saved), host);
    }

    public LiveResponse get(Authentication authentication, String liveId) {
        User viewer = actorResolver.optional(authentication).orElse(null);
        Live live = accessService.requireViewable(liveId, viewer);
        return toDetail(live, viewer);
    }

    public LivePageResponse discover(
        Authentication authentication,
        int page,
        Integer size,
        String category,
        String status,
        String query,
        String sort,
        boolean followingOnly
    ) {
        User viewer = actorResolver.optional(authentication).orElse(null);
        if (followingOnly && viewer == null) {
            throw new UnauthorizedException("Authentication required");
        }
        LiveProperties.Discovery discovery = properties.getDiscovery();
        LiveStatus listStatus = parseDiscoveryStatus(status);
        List<LiveCategory> categories = parseCategoryFilter(category);
        String search = SqlSafe.sanitizeLikeTerm(query, discovery.getMaxSearchLength()).toLowerCase(Locale.ROOT);
        String searchPattern = search.isEmpty() ? null : "%" + search + "%";

        int pageSize = size == null ? discovery.getDefaultPageSize() : size;
        PageRequest pageRequest = SqlSafe.pageRequest(page, pageSize, discovery.getMaxPageSize(), discoverySort(listStatus, sort));
        Slice<Live> slice = liveRepository.findDiscoverable(
            listStatus,
            categories,
            searchPattern,
            viewer == null ? null : viewer.getId(),
            followingOnly,
            pageRequest
        );

        List<Live> lives = slice.getContent();
        Map<Long, CounterSnapshot> counters = listStatus == LiveStatus.LIVE
            ? safeSnapshot(lives.stream().map(Live::getId).toList())
            : Map.of();
        Set<Long> followedHostIds = followedHosts(viewer, lives);
        List<LiveResponse> items = lives.stream()
            .map(live -> {
                boolean isOwner = live.isHostedBy(viewer);
                return mapper.toResponse(
                    live,
                    counters.get(live.getId()),
                    0,
                    isOwner,
                    followedHostIds.contains(live.getHost().getId()),
                    isOwner
                );
            })
            .toList();
        return new LivePageResponse(items, slice.hasNext(), pageRequest.getPageNumber(), pageRequest.getPageSize());
    }

    public LiveResponse start(Authentication authentication, String liveId) {
        User actor = actorResolver.require(authentication);
        Live live = accessService.requireExisting(liveId);
        requireHostOrHide(live, actor);
        switch (live.getStatus()) {
            case LIVE -> throw new LiveException(LiveErrorCode.LIVE_ALREADY_STARTED);
            case ENDED, CANCELLED -> throw new LiveException(LiveErrorCode.LIVE_ALREADY_ENDED);
            default -> {
                // CREATED: continue
            }
        }
        if (liveRepository.existsByHost_IdAndStatus(actor.getId(), LiveStatus.LIVE)) {
            throw new LiveException(LiveErrorCode.HOST_ALREADY_LIVE);
        }
        int updated;
        try {
            updated = liveRepository.markLive(live.getId(), LocalDateTime.now());
        } catch (DataIntegrityViolationException ex) {
            // uq_lives_host_active: another LIVE of this host started concurrently.
            throw new LiveException(LiveErrorCode.HOST_ALREADY_LIVE);
        }
        if (updated == 0) {
            throw transitionConflict(live);
        }
        try {
            store.activate(live.getId());
        } catch (RuntimeException ex) {
            log.warn("live.realtime.activate_failed live={} reason={}", live.getPublicId(), ex.getClass().getSimpleName());
        }
        Live started = reload(live);
        try {
            mediaService.createSession(started);
        } catch (RuntimeException ex) {
            // The publish-credential endpoint creates the session lazily if this failed.
            log.warn("live.media.session_create_failed live={} reason={}", started.getPublicId(), ex.getClass().getSimpleName());
        }
        publisher.publish(started.getPublicId(), LiveEventType.LIVE_STARTED, statusPayload(started, null));
        log.info("live.started live={} hostId={}", started.getPublicId(), actor.getId());
        return toDetail(started, actor);
    }

    /** LIVE -> ENDED by the host or a platform admin; persists final statistics and drops realtime state. */
    public LiveResponse end(Authentication authentication, String liveId) {
        User actor = actorResolver.require(authentication);
        Live live = accessService.requireExisting(liveId);
        if (!live.isHostedBy(actor) && !LiveAccessService.isAdmin(actor)) {
            if (!accessService.canSee(live, actor)) {
                throw new LiveException(LiveErrorCode.LIVE_NOT_FOUND);
            }
            throw new LiveException(LiveErrorCode.NOT_LIVE_HOST);
        }
        switch (live.getStatus()) {
            case CREATED -> throw new LiveException(
                LiveErrorCode.INVALID_LIVE_STATE,
                "This LIVE has not started; cancel it instead"
            );
            case ENDED, CANCELLED -> throw new LiveException(LiveErrorCode.LIVE_ALREADY_ENDED);
            default -> {
                // LIVE: continue
            }
        }

        boolean byHost = live.isHostedBy(actor);
        Live ended = finish(live, byHost ? END_REASON_HOST : END_REASON_ADMIN);
        log.info("live.ended live={} actorId={} byHost={}", ended.getPublicId(), actor.getId(), byHost);
        return toDetail(ended, actor);
    }

    /**
     * Ends a LIVE without a user action (host stream lost beyond the reconnect grace period, host never
     * started publishing). A LIVE that is already finished only gets its media session closed.
     */
    public void endBySystem(long liveId, String reason) {
        Live live = liveRepository.findWithHostById(liveId).orElse(null);
        if (live == null) {
            return;
        }
        if (live.getStatus() != LiveStatus.LIVE) {
            mediaService.endSession(live);
            return;
        }
        try {
            Live ended = finish(live, reason);
            log.info("live.ended live={} actor=system reason={}", ended.getPublicId(), reason);
        } catch (LiveException ex) {
            // Ended concurrently by the host or another node.
            log.debug("live.end_by_system.skipped live={} code={}", live.getPublicId(), ex.getCode());
        }
    }

    /**
     * LIVE -> ENDED: final statistics, media revocation and SRS cleanup, then LIVE_ENDED broadcast and
     * realtime cleanup. Media cleanup failures never undo the business transition; they are retried.
     */
    private Live finish(Live live, String reason) {
        long peak = live.getPeakViewerCount();
        long likes = live.getLikeCount();
        try {
            // Stop accepting viewers before the final snapshot so no join slips in after it.
            store.deactivate(live.getId());
            peak = Math.max(peak, store.peakViewerCount(live.getId()));
            likes = Math.max(likes, store.likeCount(live.getId(), likes));
        } catch (RuntimeException ex) {
            log.warn("live.realtime.snapshot_failed live={} reason={}", live.getPublicId(), ex.getClass().getSimpleName());
        }

        LocalDateTime endedAt = LocalDateTime.now();
        int updated;
        try {
            updated = liveRepository.markEnded(live.getId(), endedAt, peak, likes);
        } catch (RuntimeException ex) {
            reactivateQuietly(live);
            throw ex;
        }
        if (updated == 0) {
            throw transitionConflict(live);
        }

        likeService.flushLikeCount(live.getId());
        // Release viewer slots before SRS disconnects players, so their on_stop hooks are no-ops.
        viewerService.onLiveEnded(live.getId(), endedAt);
        mediaService.endSession(live);

        Live ended = reload(live);
        publisher.publish(ended.getPublicId(), LiveEventType.LIVE_ENDED, statusPayload(ended, reason));
        counterBroadcaster.forget(live.getId());
        try {
            store.clear(live.getId());
        } catch (RuntimeException ex) {
            log.warn("live.realtime.clear_failed live={} reason={}", live.getPublicId(), ex.getClass().getSimpleName());
        }
        return ended;
    }

    /** Host only: a fresh single-use WHIP credential for (re)publishing the camera/microphone stream. */
    public LivePublishCredentialResponse publishCredential(Authentication authentication, String liveId) {
        User actor = actorResolver.require(authentication);
        Live live = accessService.requireExisting(liveId);
        requireHostOrHide(live, actor);
        return mediaService.getPublishInfo(live);
    }

    /** Anyone allowed to see the LIVE (guests included): WHEP endpoint while the host is publishing. */
    public LivePlaybackResponse playback(Authentication authentication, String liveId) {
        User viewer = actorResolver.optional(authentication).orElse(null);
        Live live = accessService.requireViewable(liveId, viewer);
        return mediaService.getPlaybackInfo(live, viewer);
    }

    /** CREATED -> CANCELLED (host only). */
    public LiveResponse cancel(Authentication authentication, String liveId) {
        User actor = actorResolver.require(authentication);
        Live live = accessService.requireExisting(liveId);
        requireHostOrHide(live, actor);
        switch (live.getStatus()) {
            case LIVE -> throw new LiveException(LiveErrorCode.INVALID_LIVE_STATE, "This LIVE is broadcasting; end it instead");
            case ENDED, CANCELLED -> throw new LiveException(LiveErrorCode.LIVE_ALREADY_ENDED);
            default -> {
                // CREATED: continue
            }
        }
        if (liveRepository.markCancelled(live.getId(), LocalDateTime.now()) == 0) {
            throw transitionConflict(live);
        }
        log.info("live.cancelled live={} hostId={}", live.getPublicId(), actor.getId());
        return toDetail(reload(live), actor);
    }

    public LiveResponse updateSettings(Authentication authentication, String liveId, UpdateLiveRequest request) {
        User actor = actorResolver.require(authentication);
        Live live = accessService.requireExisting(liveId);
        requireHostOrHide(live, actor);
        if (live.getStatus().isFinished()) {
            throw new LiveException(LiveErrorCode.LIVE_ALREADY_ENDED);
        }
        if (request.title() != null) {
            live.setTitle(requireTitle(request.title()));
        }
        if (request.description() != null) {
            live.setDescription(trimToNull(request.description()));
        }
        if (request.category() != null) {
            live.setCategory(parseCategory(request.category()));
        }
        if (request.coverUrl() != null) {
            live.setCoverUrl(validatedCover(request.coverUrl(), actor));
        }
        if (request.visibility() != null) {
            live.setVisibility(parseVisibility(request.visibility()));
        }
        if (request.allowComments() != null) {
            live.setAllowComments(request.allowComments());
        }
        if (request.allowGifts() != null) {
            live.setAllowGifts(request.allowGifts());
        }
        if (request.allowGuests() != null) {
            live.setAllowGuests(request.allowGuests());
        }
        if (request.matureContent() != null) {
            live.setMatureContent(request.matureContent());
        }
        try {
            liveRepository.save(live);
        } catch (ObjectOptimisticLockingFailureException ex) {
            throw new LiveException(LiveErrorCode.CONCURRENT_UPDATE);
        }
        Live updated = reload(live);
        publisher.publish(updated.getPublicId(), LiveEventType.LIVE_UPDATED, settingsPayload(updated));
        return toDetail(updated, actor);
    }

    public LiveStatsResponse stats(Authentication authentication, String liveId) {
        User viewer = actorResolver.optional(authentication).orElse(null);
        Live live = accessService.requireViewable(liveId, viewer);
        LiveResponse response = mapper.toResponse(live, counters(live), realtimePeak(live), false, false, false);
        Boolean publishing;
        try {
            publishing = mediaService.isPublishing(live);
        } catch (RuntimeException ex) {
            publishing = null;
        }
        return new LiveStatsResponse(
            response.status(),
            response.viewerCount(),
            response.peakViewerCount(),
            response.likeCount(),
            publishing
        );
    }

    private LiveResponse toDetail(Live live, User viewer) {
        boolean isOwner = live.isHostedBy(viewer);
        return mapper.toResponse(
            live,
            counters(live),
            realtimePeak(live),
            isOwner,
            accessService.isFollowing(viewer, live.getHost()),
            accessService.canModerate(live, viewer)
        );
    }

    private CounterSnapshot counters(Live live) {
        if (live.getStatus() != LiveStatus.LIVE) {
            return null;
        }
        return safeSnapshot(List.of(live.getId())).get(live.getId());
    }

    private long realtimePeak(Live live) {
        if (live.getStatus() != LiveStatus.LIVE) {
            return 0;
        }
        try {
            return store.peakViewerCount(live.getId());
        } catch (RuntimeException ex) {
            return 0;
        }
    }

    private Map<Long, CounterSnapshot> safeSnapshot(List<Long> liveIds) {
        if (liveIds.isEmpty()) {
            return Map.of();
        }
        try {
            return store.snapshot(liveIds);
        } catch (RuntimeException ex) {
            log.warn("live.realtime.snapshot_failed count={} reason={}", liveIds.size(), ex.getClass().getSimpleName());
            return Map.of();
        }
    }

    private Set<Long> followedHosts(User viewer, List<Live> lives) {
        if (viewer == null || lives.isEmpty()) {
            return Set.of();
        }
        Set<Long> hostIds = new HashSet<>();
        for (Live live : lives) {
            if (!live.isHostedBy(viewer)) {
                hostIds.add(live.getHost().getId());
            }
        }
        if (hostIds.isEmpty()) {
            return Set.of();
        }
        return new HashSet<>(followRepository.findFollowingIdsForFollower(viewer.getId(), hostIds));
    }

    private void requireHostOrHide(Live live, User actor) {
        if (live.isHostedBy(actor)) {
            return;
        }
        if (!accessService.canSee(live, actor)) {
            throw new LiveException(LiveErrorCode.LIVE_NOT_FOUND);
        }
        throw new LiveException(LiveErrorCode.NOT_LIVE_HOST);
    }

    /** Maps a lost conditional update to the error matching the state another request produced. */
    private LiveException transitionConflict(Live live) {
        LiveStatus current = liveRepository.findById(live.getId())
            .map(Live::getStatus)
            .orElseThrow(() -> new LiveException(LiveErrorCode.LIVE_NOT_FOUND));
        return switch (current) {
            case LIVE -> new LiveException(LiveErrorCode.LIVE_ALREADY_STARTED);
            case ENDED, CANCELLED -> new LiveException(LiveErrorCode.LIVE_ALREADY_ENDED);
            case CREATED -> new LiveException(LiveErrorCode.INVALID_LIVE_STATE);
        };
    }

    private void reactivateQuietly(Live live) {
        try {
            store.activate(live.getId());
        } catch (RuntimeException ignored) {
            // The periodic reconciliation re-activates LIVEs that are still LIVE in the database.
        }
    }

    private Live reload(Live live) {
        return liveRepository.findWithHostByPublicId(live.getPublicId())
            .orElseThrow(() -> new LiveException(LiveErrorCode.LIVE_NOT_FOUND));
    }

    private static Map<String, Object> statusPayload(Live live, String reason) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("status", live.getStatus().name());
        payload.put("startedAt", live.getStartedAt());
        payload.put("endedAt", live.getEndedAt());
        payload.put("peakViewerCount", live.getPeakViewerCount());
        payload.put("likeCount", live.getLikeCount());
        if (reason != null) {
            payload.put("reason", reason);
        }
        return payload;
    }

    private Map<String, Object> settingsPayload(Live live) {
        LiveResponse response = mapper.toResponse(live, null, 0, false, false, false);
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("title", response.title());
        payload.put("description", response.description());
        payload.put("category", response.category());
        payload.put("coverUrl", response.coverUrl());
        payload.put("visibility", response.visibility());
        payload.put("allowComments", response.allowComments());
        payload.put("allowGifts", response.allowGifts());
        payload.put("giftsAvailable", response.giftsAvailable());
        payload.put("matureContent", response.matureContent());
        return payload;
    }

    private static Sort discoverySort(LiveStatus status, String sort) {
        if (status == LiveStatus.ENDED) {
            return Sort.by(Sort.Order.desc("endedAt"), Sort.Order.desc("id"));
        }
        String normalized = sort == null ? "viewers" : sort.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "", "viewers", "popular" -> Sort.by(
                Sort.Order.desc("viewerCount"),
                Sort.Order.desc("startedAt"),
                Sort.Order.desc("id")
            );
            case "recent", "newest" -> Sort.by(Sort.Order.desc("startedAt"), Sort.Order.desc("id"));
            default -> throw new BadRequestException("Unsupported sort: use viewers or recent");
        };
    }

    private static LiveStatus parseDiscoveryStatus(String raw) {
        if (raw == null || raw.isBlank()) {
            return LiveStatus.LIVE;
        }
        String normalized = raw.trim().toUpperCase(Locale.ROOT);
        if (normalized.equals(LiveStatus.LIVE.name())) {
            return LiveStatus.LIVE;
        }
        if (normalized.equals(LiveStatus.ENDED.name())) {
            return LiveStatus.ENDED;
        }
        throw new BadRequestException("Status filter must be LIVE or ENDED");
    }

    private static List<LiveCategory> parseCategoryFilter(String raw) {
        if (raw == null || raw.isBlank() || raw.trim().equalsIgnoreCase("all")) {
            return Arrays.asList(LiveCategory.values());
        }
        return LiveCategory.parse(raw)
            .map(LiveCategory::withChildren)
            .orElseThrow(() -> new LiveException(LiveErrorCode.INVALID_CATEGORY));
    }

    private static LiveCategory parseCategory(String raw) {
        return LiveCategory.parse(raw).orElseThrow(() -> new LiveException(LiveErrorCode.INVALID_CATEGORY));
    }

    private static LiveVisibility parseVisibility(String raw) {
        try {
            return LiveVisibility.valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new LiveException(LiveErrorCode.INVALID_VISIBILITY);
        }
    }

    private static String requireTitle(String raw) {
        String title = trimToNull(raw);
        if (title == null) {
            throw new BadRequestException("Title is required");
        }
        return title;
    }

    private String validatedCover(String raw, User host) {
        String url = trimToNull(raw);
        if (url == null) {
            return null;
        }
        mediaValidator.requireOwnedThumbnail(url, host.getId());
        return url;
    }

    private static String trimToNull(String raw) {
        if (!StringUtils.hasText(raw)) {
            return null;
        }
        return raw.trim();
    }
}
