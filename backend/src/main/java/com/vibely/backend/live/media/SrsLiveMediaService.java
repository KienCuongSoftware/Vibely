package com.vibely.backend.live.media;

import com.vibely.backend.live.config.LiveProperties;
import com.vibely.backend.live.entity.Live;
import com.vibely.backend.live.entity.LiveMediaSession;
import com.vibely.backend.live.entity.LiveMediaSessionStatus;
import com.vibely.backend.live.entity.LiveStatus;
import com.vibely.backend.live.exception.LiveErrorCode;
import com.vibely.backend.live.exception.LiveException;
import com.vibely.backend.live.media.dto.LiveIceServer;
import com.vibely.backend.live.media.dto.LivePlaybackResponse;
import com.vibely.backend.live.media.dto.LivePublishCredentialResponse;
import com.vibely.backend.live.realtime.LiveRealtimeStore;
import com.vibely.backend.live.repository.LiveMediaSessionRepository;
import com.vibely.backend.live.service.LiveViewerService;
import com.vibely.backend.user.entity.User;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * SRS (WHIP/WHEP) implementation. Browsers exchange SDP with SRS directly through the reverse proxy;
 * SRS asks this service, via HTTP hooks, whether each publish/play may proceed.
 */
@Service
@ConditionalOnProperty(name = "live.media.enabled", havingValue = "true")
public class SrsLiveMediaService implements LiveMediaService {

    static final String PLAYBACK_TYPE = "webrtc";

    private static final Logger log = LoggerFactory.getLogger(SrsLiveMediaService.class);
    private static final String WHIP_PATH = "/rtc/v1/whip/";
    private static final String WHEP_PATH = "/rtc/v1/whep/";

    private final LiveMediaSessionRepository sessionRepository;
    private final LiveMediaTokenService tokens;
    private final SrsClient srsClient;
    private final LiveViewerService viewerService;
    private final LiveProperties.Media config;
    private final LiveProperties.Hls hls;

    public SrsLiveMediaService(
        LiveMediaSessionRepository sessionRepository,
        LiveMediaTokenService tokens,
        SrsClient srsClient,
        LiveViewerService viewerService,
        LiveProperties properties
    ) {
        this.sessionRepository = sessionRepository;
        this.tokens = tokens;
        this.srsClient = srsClient;
        this.viewerService = viewerService;
        this.config = properties.getMedia();
        this.hls = properties.getHls();
    }

    @Override
    public boolean isEnabled() {
        return true;
    }

    @Override
    public void createSession(Live live) {
        ensureSession(live);
    }

    @Override
    public LivePublishCredentialResponse getPublishInfo(Live live) {
        if (live.getStatus() != LiveStatus.LIVE) {
            throw new LiveException(live.getStatus().isFinished() ? LiveErrorCode.LIVE_ALREADY_ENDED : LiveErrorCode.LIVE_NOT_ACTIVE);
        }
        LiveMediaSession session = ensureSession(live);
        if (session.isEnded()) {
            throw new LiveException(LiveErrorCode.LIVE_ALREADY_ENDED);
        }
        String token = tokens.newPublishToken();
        Instant expiresAt = Instant.now().plusSeconds(Math.max(30, config.getPublishTokenTtlSeconds()));
        if (sessionRepository.rotatePublishToken(session.getId(), tokens.hashPublishToken(token), toLocal(expiresAt)) == 0) {
            throw new LiveException(LiveErrorCode.LIVE_ALREADY_ENDED);
        }
        log.info("live.media.publish_credential_issued live={} session={}", live.getPublicId(), session.getId());
        return new LivePublishCredentialResponse(
            endpoint(WHIP_PATH, session.getStreamName(), token),
            iceServers(),
            expiresAt,
            session.getStatus() == LiveMediaSessionStatus.PUBLISHING
        );
    }

    @Override
    public LivePlaybackResponse getPlaybackInfo(Live live, User viewer) {
        if (live.getStatus() != LiveStatus.LIVE) {
            return new LivePlaybackResponse(PLAYBACK_TYPE, live.getStatus().name(), false, null, null, null, false, null);
        }
        Optional<LiveMediaSession> session = sessionRepository.findByLiveId(live.getId());
        if (session.isEmpty() || session.get().getStatus() != LiveMediaSessionStatus.PUBLISHING) {
            boolean interrupted = session.isPresent() && session.get().getStatus() == LiveMediaSessionStatus.INTERRUPTED;
            return new LivePlaybackResponse(PLAYBACK_TYPE, live.getStatus().name(), false, null, iceServers(), null, interrupted, null);
        }
        String viewerKey = viewer == null ? tokens.newGuestViewerKey() : LiveRealtimeStore.userKey(viewer.getId());
        Instant expiresAt = Instant.now().plusSeconds(Math.max(15, config.getPlaybackTokenTtlSeconds()));
        String token = tokens.issuePlaybackToken(session.get().getId(), viewerKey, expiresAt);
        return new LivePlaybackResponse(
            PLAYBACK_TYPE,
            live.getStatus().name(),
            true,
            endpoint(WHEP_PATH, session.get().getStreamName(), token),
            iceServers(),
            expiresAt,
            false,
            hlsUrl(session.get())
        );
    }

    /** Null unless the HLS fallback is enabled; SRS writes the playlist as {@code <stream>.m3u8}. */
    private String hlsUrl(LiveMediaSession session) {
        if (!hls.isEnabled()) {
            return null;
        }
        Instant expiresAt = Instant.now().plusSeconds(Math.max(60, hls.getTokenTtlSeconds()));
        String token = tokens.issueHlsToken(session.getId(), expiresAt);
        String path = StringUtils.hasText(hls.getPublicPath()) ? hls.getPublicPath().trim() : "/live-hls/";
        if (!path.endsWith("/")) {
            path = path + "/";
        }
        return publicBase() + path + encode(session.getStreamName()) + ".m3u8?token=" + encode(token);
    }

    @Override
    public Optional<LiveMediaSession> validateSession(String streamName) {
        if (!StringUtils.hasText(streamName)) {
            return Optional.empty();
        }
        return sessionRepository.findByStreamName(streamName).filter(session -> !session.isEnded());
    }

    @Override
    public Boolean isPublishing(Live live) {
        if (live.getStatus() != LiveStatus.LIVE) {
            return false;
        }
        return sessionRepository.findByLiveId(live.getId())
            .map(session -> session.getStatus() == LiveMediaSessionStatus.PUBLISHING)
            .orElse(false);
    }

    @Override
    public Optional<LiveMediaSession> revokeSession(Live live) {
        Optional<LiveMediaSession> session = sessionRepository.findByLiveId(live.getId());
        session.ifPresent(found -> {
            if (sessionRepository.markEnded(found.getId(), LocalDateTime.now()) > 0) {
                log.info("live.media.session_revoked live={} session={}", live.getPublicId(), found.getId());
            }
        });
        return session;
    }

    @Override
    public void disconnectViewer(Live live, long userId) {
        for (String clientId : viewerService.mediaClientIds(live.getId(), userId)) {
            try {
                srsClient.kickClient(clientId);
                viewerService.leaveMediaViewer(clientId);
                log.info("live.media.viewer_disconnected live={} client={}", live.getPublicId(), clientId);
            } catch (RuntimeException ex) {
                log.warn("live.media.viewer_disconnect_failed live={} client={} reason={}",
                    live.getPublicId(), clientId, ex.getClass().getSimpleName());
            }
        }
    }

    @Override
    public void endSession(Live live) {
        Optional<LiveMediaSession> session;
        try {
            session = revokeSession(live);
        } catch (RuntimeException ex) {
            log.error("live.media.revoke_failed live={} reason={}", live.getPublicId(), ex.getClass().getSimpleName());
            return;
        }
        session.ifPresent(this::cleanupQuietly);
    }

    /** Disconnects every SRS client (publisher and players) of an ended session; true when done. */
    boolean cleanupQuietly(LiveMediaSession session) {
        try {
            int kicked = disconnectClients(session.getStreamName());
            sessionRepository.markCleanedUp(session.getId());
            log.info("live.media.cleanup_done session={} clients={}", session.getId(), kicked);
            return true;
        } catch (SrsUnavailableException ex) {
            log.warn("live.media.cleanup_failed session={} reason={} retry=scheduled", session.getId(), ex.getMessage());
            return false;
        } catch (RuntimeException ex) {
            log.warn("live.media.cleanup_failed session={} reason={} retry=scheduled", session.getId(), ex.getClass().getSimpleName());
            return false;
        }
    }

    private int disconnectClients(String streamName) {
        int kicked = 0;
        for (SrsClient.SrsClientInfo client : srsClient.listClients()) {
            if (streamName.equals(client.streamName()) && srsClient.kickClient(client.id())) {
                kicked++;
            }
        }
        return kicked;
    }

    private LiveMediaSession ensureSession(Live live) {
        Optional<LiveMediaSession> existing = sessionRepository.findByLiveId(live.getId());
        if (existing.isPresent()) {
            return existing.get();
        }
        try {
            LiveMediaSession created = sessionRepository.saveAndFlush(
                new LiveMediaSession(live.getId(), tokens.newStreamName(), LocalDateTime.now())
            );
            log.info("live.media.session_created live={} session={}", live.getPublicId(), created.getId());
            return created;
        } catch (DataIntegrityViolationException ex) {
            // Created concurrently by another request for the same LIVE.
            return sessionRepository.findByLiveId(live.getId())
                .orElseThrow(() -> new LiveException(LiveErrorCode.MEDIA_UNAVAILABLE));
        }
    }

    private String publicBase() {
        String base = config.getPublicUrl() == null ? "" : config.getPublicUrl().trim();
        if (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        return base;
    }

    private String endpoint(String path, String streamName, String token) {
        return publicBase() + path
            + "?app=" + encode(config.getApp())
            + "&stream=" + encode(streamName)
            + "&token=" + encode(token);
    }

    private List<LiveIceServer> iceServers() {
        List<LiveIceServer> servers = new ArrayList<>();
        List<String> stun = nonBlank(config.getStunUrls());
        if (!stun.isEmpty()) {
            servers.add(new LiveIceServer(stun, null, null));
        }
        List<String> turn = nonBlank(config.getTurnUrls());
        if (!turn.isEmpty()) {
            servers.add(new LiveIceServer(turn, config.getTurnUsername(), config.getTurnCredential()));
        }
        return servers;
    }

    private static List<String> nonBlank(List<String> values) {
        if (values == null) {
            return List.of();
        }
        return values.stream().filter(StringUtils::hasText).map(String::trim).toList();
    }

    private static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private static LocalDateTime toLocal(Instant instant) {
        return LocalDateTime.ofInstant(instant, ZoneId.systemDefault());
    }
}
