package com.vibely.backend.live.media;

import com.vibely.backend.live.config.LiveProperties;
import com.vibely.backend.live.entity.Live;
import com.vibely.backend.live.entity.LiveMediaSession;
import com.vibely.backend.live.entity.LiveStatus;
import com.vibely.backend.live.exception.LiveException;
import com.vibely.backend.live.media.LiveMediaTokenService.PlaybackClaims;
import com.vibely.backend.live.media.dto.SrsHookRequest;
import com.vibely.backend.live.realtime.LiveEventPublisher;
import com.vibely.backend.live.recording.LiveRecordingService;
import com.vibely.backend.live.realtime.LiveEventType;
import com.vibely.backend.live.repository.LiveMediaSessionRepository;
import com.vibely.backend.live.repository.LiveRepository;
import com.vibely.backend.live.service.LiveAccessService;
import com.vibely.backend.live.service.LiveViewerService;
import com.vibely.backend.user.entity.User;
import com.vibely.backend.user.repository.UserRepository;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * Decides SRS hook callbacks. on_publish/on_play are authorization points (SRS drops the client
 * unless we accept); on_unpublish/on_stop are notifications. Tokens are never logged.
 */
@Service
@ConditionalOnProperty(name = "live.media.enabled", havingValue = "true")
public class LiveMediaHookService {

    private static final Logger log = LoggerFactory.getLogger(LiveMediaHookService.class);
    private static final String TOKEN_PARAM = "token";

    private final LiveMediaService mediaService;
    private final LiveMediaSessionRepository sessionRepository;
    private final LiveRepository liveRepository;
    private final UserRepository userRepository;
    private final LiveAccessService accessService;
    private final LiveViewerService viewerService;
    private final LiveMediaTokenService tokens;
    private final LiveEventPublisher publisher;
    private final LiveMediaMetrics metrics;
    private final LiveProperties.Media config;
    private final LiveRecordingService recordingService;

    public LiveMediaHookService(
        LiveMediaService mediaService,
        LiveMediaSessionRepository sessionRepository,
        LiveRepository liveRepository,
        UserRepository userRepository,
        LiveAccessService accessService,
        LiveViewerService viewerService,
        LiveMediaTokenService tokens,
        LiveEventPublisher publisher,
        LiveMediaMetrics metrics,
        LiveProperties properties,
        LiveRecordingService recordingService
    ) {
        this.mediaService = mediaService;
        this.sessionRepository = sessionRepository;
        this.liveRepository = liveRepository;
        this.userRepository = userRepository;
        this.accessService = accessService;
        this.viewerService = viewerService;
        this.tokens = tokens;
        this.publisher = publisher;
        this.metrics = metrics;
        this.config = properties.getMedia();
        this.recordingService = recordingService;
    }

    /** @return true to let SRS accept the client */
    public boolean handle(SrsHookRequest hook) {
        String action = hook.action() == null ? "" : hook.action();
        return switch (action) {
            case "on_publish" -> onPublish(hook);
            case "on_unpublish" -> {
                onUnpublish(hook);
                yield true;
            }
            case "on_play" -> onPlay(hook);
            case "on_stop" -> {
                onStop(hook);
                yield true;
            }
            case "on_dvr" -> {
                onDvr(hook);
                yield true;
            }
            default -> {
                log.warn("live.media.hook_unknown action={}", action);
                yield false;
            }
        };
    }

    private boolean onPublish(SrsHookRequest hook) {
        Optional<Target> target = resolve(hook);
        if (target.isEmpty()) {
            return rejectPublish(hook, "unknown_stream");
        }
        LiveMediaSession session = target.get().session();
        Live live = target.get().live();
        if (live.getStatus() != LiveStatus.LIVE) {
            return rejectPublish(hook, "live_not_active");
        }
        String token = tokenFrom(hook.param());
        if (token == null || !StringUtils.hasText(hook.clientId())) {
            return rejectPublish(hook, "missing_credential");
        }
        int accepted = sessionRepository.markPublishing(
            session.getId(),
            tokens.hashPublishToken(token),
            hook.clientId(),
            LocalDateTime.now()
        );
        if (accepted == 0) {
            return rejectPublish(hook, "invalid_credential");
        }
        if (session.getPublishCount() > 0) {
            metrics.hostReconnected();
        }
        publishStreamState(live, true, null);
        log.info("live.media.publish_accepted live={} session={} client={} attempt={}",
            live.getPublicId(), session.getId(), hook.clientId(), session.getPublishCount() + 1);
        return true;
    }

    private void onUnpublish(SrsHookRequest hook) {
        Optional<Target> target = resolve(hook);
        if (target.isEmpty() || !StringUtils.hasText(hook.clientId())) {
            return;
        }
        LiveMediaSession session = target.get().session();
        LocalDateTime now = LocalDateTime.now();
        // Only the client that owns the stream can interrupt it; a late notification from a replaced
        // connection is ignored.
        if (sessionRepository.markInterrupted(session.getId(), hook.clientId(), now) > 0) {
            Instant deadline = Instant.now().plusSeconds(config.getReconnectGraceSeconds());
            publishStreamState(target.get().live(), false, deadline);
            log.info("live.media.publish_interrupted live={} session={} client={} graceSeconds={}",
                target.get().live().getPublicId(), session.getId(), hook.clientId(), config.getReconnectGraceSeconds());
        }
    }

    private boolean onPlay(SrsHookRequest hook) {
        Optional<Target> target = resolve(hook);
        if (target.isEmpty()) {
            return rejectPlay(hook, "unknown_stream");
        }
        Live live = target.get().live();
        if (live.getStatus() != LiveStatus.LIVE) {
            return rejectPlay(hook, "live_not_active");
        }
        if (!StringUtils.hasText(hook.clientId())) {
            return rejectPlay(hook, "missing_client");
        }
        Optional<PlaybackClaims> claims = tokens.verifyPlaybackToken(tokenFrom(hook.param()), Instant.now());
        if (claims.isEmpty() || claims.get().sessionId() != target.get().session().getId()) {
            return rejectPlay(hook, "invalid_credential");
        }
        String viewerKey = claims.get().viewerKey();
        User viewer = null;
        if (viewerKey.startsWith("u")) {
            viewer = parseUserId(viewerKey).flatMap(userRepository::findById).orElse(null);
            if (viewer == null) {
                return rejectPlay(hook, "unknown_viewer");
            }
        }
        // Visibility or a ban may have changed since the token was issued.
        try {
            accessService.requireViewable(live, viewer);
        } catch (LiveException ex) {
            return rejectPlay(hook, "not_allowed");
        }
        if (!viewerService.joinMediaViewer(live, hook.clientId(), viewerKey, viewer)) {
            return rejectPlay(hook, "live_not_active");
        }
        metrics.viewerConnected();
        log.debug("live.media.play_accepted live={} client={}", live.getPublicId(), hook.clientId());
        return true;
    }

    private void onStop(SrsHookRequest hook) {
        if (StringUtils.hasText(hook.clientId())) {
            viewerService.leaveMediaViewer(hook.clientId());
        }
    }

    /** A notification: the file is already closed, so the answer cannot affect the stream. */
    private void onDvr(SrsHookRequest hook) {
        if (!config.getApp().equals(hook.app())) {
            log.warn("live.media.dvr_unknown_app app={}", hook.app());
            return;
        }
        recordingService.onDvr(hook.stream(), hook.cwd(), hook.file());
    }

    private Optional<Target> resolve(SrsHookRequest hook) {
        if (!config.getApp().equals(hook.app())) {
            return Optional.empty();
        }
        return mediaService.validateSession(hook.stream())
            .flatMap(session -> liveRepository.findWithHostById(session.getLiveId()).map(live -> new Target(session, live)));
    }

    private void publishStreamState(Live live, boolean publishing, Instant reconnectDeadline) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("publishing", publishing);
        payload.put("reconnectDeadline", reconnectDeadline);
        publisher.publish(live.getPublicId(), LiveEventType.STREAM_STATE_UPDATED, payload);
    }

    private boolean rejectPublish(SrsHookRequest hook, String reason) {
        metrics.publishFailed();
        log.warn("live.media.publish_rejected client={} reason={}", hook.clientId(), reason);
        return false;
    }

    private boolean rejectPlay(SrsHookRequest hook, String reason) {
        log.info("live.media.play_rejected client={} reason={}", hook.clientId(), reason);
        return false;
    }

    /** Extracts {@code token} from the hook param (WHIP/WHEP query string, with or without a leading '?'). */
    static String tokenFrom(String param) {
        if (!StringUtils.hasText(param)) {
            return null;
        }
        String query = param.startsWith("?") ? param.substring(1) : param;
        for (String pair : query.split("&")) {
            int eq = pair.indexOf('=');
            if (eq > 0 && TOKEN_PARAM.equals(pair.substring(0, eq))) {
                String value = URLDecoder.decode(pair.substring(eq + 1), StandardCharsets.UTF_8);
                return value.isBlank() ? null : value;
            }
        }
        return null;
    }

    private static Optional<Long> parseUserId(String viewerKey) {
        try {
            return Optional.of(Long.parseLong(viewerKey.substring(1)));
        } catch (NumberFormatException ex) {
            return Optional.empty();
        }
    }

    private record Target(LiveMediaSession session, Live live) {}
}
