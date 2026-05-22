package com.vibely.backend.share;

import com.vibely.backend.config.AppUrlProperties;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.OffsetDateTime;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RedirectService {

    private final ShortLinkCache shortLinkCache;
    private final ShortLinkRepository shortLinkRepository;
    private final AppUrlProperties appUrlProperties;
    private final ShareAsyncRecorder shareAsyncRecorder;

    public RedirectService(
        ShortLinkCache shortLinkCache,
        ShortLinkRepository shortLinkRepository,
        AppUrlProperties appUrlProperties,
        ShareAsyncRecorder shareAsyncRecorder
    ) {
        this.shortLinkCache = shortLinkCache;
        this.shortLinkRepository = shortLinkRepository;
        this.appUrlProperties = appUrlProperties;
        this.shareAsyncRecorder = shareAsyncRecorder;
    }

    @Transactional(readOnly = true)
    public void redirectShortCode(String shortCode, HttpServletRequest request, HttpServletResponse response)
        throws IOException {
        String normalized = normalizeCode(shortCode);
        if (normalized == null) {
            response.sendError(HttpStatus.NOT_FOUND.value());
            return;
        }

        if (shortLinkCache.isKnownMiss(normalized)) {
            response.sendError(HttpStatus.NOT_FOUND.value());
            return;
        }

        Optional<ShortLinkCacheEntry> cached = shortLinkCache.get(normalized);
        if (cached.isPresent() && cached.get().isActive()) {
            sendRedirect(cached.get().videoId(), normalized, null, request, response);
            return;
        }

        Optional<ShortLink> fromDb = shortLinkRepository.findByShortCodeAndStatus(normalized, ShortLinkStatus.ACTIVE);
        if (fromDb.isEmpty()) {
            shortLinkCache.markMiss(normalized);
            response.sendError(HttpStatus.NOT_FOUND.value());
            return;
        }

        ShortLink link = fromDb.get();
        if (link.getExpiresAt() != null && link.getExpiresAt().isBefore(OffsetDateTime.now())) {
            response.sendError(HttpStatus.GONE.value());
            return;
        }

        shortLinkCache.put(new ShortLinkCacheEntry(
            link.getVideo().getId(),
            link.getShortCode(),
            link.getStatus()
        ));

        sendRedirect(link.getVideo().getId(), normalized, link, request, response);
    }

    private void sendRedirect(
        long videoId,
        String shortCode,
        ShortLink linkForAnalytics,
        HttpServletRequest request,
        HttpServletResponse response
    ) throws IOException {
        String target = appUrlProperties.watchUrl(videoId)
            + "?ref=sl&code=" + shortCode;
        response.setStatus(HttpStatus.FOUND.value());
        response.setHeader("Location", target);
        response.setHeader("Cache-Control", "no-store");

        if (linkForAnalytics != null) {
            shareAsyncRecorder.recordLinkClicked(linkForAnalytics, request, (short) HttpStatus.FOUND.value());
        } else {
            shortLinkRepository.findByShortCodeAndStatus(shortCode, ShortLinkStatus.ACTIVE)
                .ifPresent(found -> shareAsyncRecorder.recordLinkClicked(found, request, (short) HttpStatus.FOUND.value()));
        }
    }

    private static String normalizeCode(String shortCode) {
        if (shortCode == null) {
            return null;
        }
        String trimmed = shortCode.trim();
        if (trimmed.isEmpty() || trimmed.length() > 12 || !trimmed.matches("^[0-9A-Za-z]+$")) {
            return null;
        }
        return trimmed;
    }
}
