package com.vibely.backend.live.media;

import com.vibely.backend.live.config.LiveProperties;
import com.vibely.backend.live.entity.LiveMediaSessionStatus;
import com.vibely.backend.live.repository.LiveMediaSessionRepository;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * Authorizes HLS playlist requests for the reverse proxy ({@code auth_request}). A request passes
 * only with a valid HLS token for the media session behind the requested stream, while that session
 * is still open; ending the LIVE therefore cuts every HLS viewer off at the next playlist reload.
 */
@Service
@ConditionalOnProperty(name = "live.media.enabled", havingValue = "true")
public class LiveHlsAccessService {

    /** {@code .../<stream>.m3u8?token=...}; stream names are "s" + 32 hex chars (LiveMediaTokenService). */
    private static final Pattern PLAYLIST = Pattern.compile("^/[^?#]*/(s[0-9a-f]{32})\\.m3u8(?:\\?([^#]*))?$");

    private final LiveMediaSessionRepository sessionRepository;
    private final LiveMediaTokenService tokens;
    private final LiveProperties.Hls config;

    public LiveHlsAccessService(
        LiveMediaSessionRepository sessionRepository,
        LiveMediaTokenService tokens,
        LiveProperties properties
    ) {
        this.sessionRepository = sessionRepository;
        this.tokens = tokens;
        this.config = properties.getHls();
    }

    public boolean authorize(String originalUri) {
        if (!config.isEnabled() || !StringUtils.hasText(originalUri)) {
            return false;
        }
        Matcher matcher = PLAYLIST.matcher(originalUri);
        if (!matcher.matches()) {
            return false;
        }
        Optional<Long> sessionId = tokens.verifyHlsToken(queryParam(matcher.group(2), "token"), Instant.now());
        if (sessionId.isEmpty()) {
            return false;
        }
        return sessionRepository.findByStreamName(matcher.group(1))
            .filter(session -> session.getId().equals(sessionId.get()))
            .map(session -> session.getStatus() == LiveMediaSessionStatus.PUBLISHING
                || session.getStatus() == LiveMediaSessionStatus.INTERRUPTED)
            .orElse(false);
    }

    static String queryParam(String query, String name) {
        if (!StringUtils.hasText(query)) {
            return null;
        }
        for (String pair : query.split("&")) {
            int eq = pair.indexOf('=');
            if (eq > 0 && name.equals(pair.substring(0, eq))) {
                try {
                    String value = URLDecoder.decode(pair.substring(eq + 1), StandardCharsets.UTF_8);
                    return value.isBlank() ? null : value;
                } catch (IllegalArgumentException ex) {
                    return null;
                }
            }
        }
        return null;
    }
}
