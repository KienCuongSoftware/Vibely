package com.vibely.backend.security;

import com.vibely.backend.common.ApiError;
import com.vibely.backend.common.ApiResponse;
import com.vibely.backend.share.ShareClientHints;
import com.vibely.backend.share.ShareRateLimiter;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final long WINDOW_SECONDS = 60L;
    private static final int AUTH_LIMIT = 20;
    private static final int COMMENT_LIMIT = 60;

    private final Map<String, Counter> counters = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper;
    private final ShareRateLimiter shareRateLimiter;

    public RateLimitFilter(ObjectMapper objectMapper, ShareRateLimiter shareRateLimiter) {
        this.objectMapper = objectMapper;
        this.shareRateLimiter = shareRateLimiter;
    }

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException {
        String uri = request.getRequestURI();
        String method = request.getMethod();
        String clientIp = ShareClientHints.clientIp(request);
        boolean authWriteRoute = uri.startsWith("/api/auth/") && "POST".equals(method);
        boolean commentWriteRoute = uri.matches("^/api/videos/\\d+/comments$") && "POST".equals(method);
        boolean redirectRoute = uri.matches("^/v/[0-9A-Za-z]+$") && "GET".equals(method);
        boolean shareWriteRoute = uri.matches("^/api/v1/videos/\\d+/share$") && "POST".equals(method);
        boolean sharePreviewRoute = uri.startsWith("/share/") && "GET".equals(method);
        boolean viewRoute = uri.matches("^/api/videos/[^/]+/views$") && "POST".equals(method);
        boolean publicShareRoute = uri.matches("^/api/videos/[^/]+/shares$") && "POST".equals(method);
        boolean downloadRoute = uri.matches("^/api/videos/[^/]+/download$") && "GET".equals(method);
        boolean antibotRoute = isAntiBotRoute(uri, method);

        if (redirectRoute) {
            if (!shareRateLimiter.allowRedirect(clientIp)) {
                writeRateLimited(response);
                return;
            }
        } else if (sharePreviewRoute) {
            if (!shareRateLimiter.allowSharePreview(clientIp)) {
                writeRateLimited(response);
                return;
            }
        } else if (shareWriteRoute) {
            String subject = request.getHeader("Authorization") != null
                ? "user:" + request.getRemoteAddr()
                : "guest:" + request.getRemoteAddr();
            if (!shareRateLimiter.allowShareWrite(subject)) {
                writeRateLimited(response);
                return;
            }
        } else if (viewRoute) {
            if (!shareRateLimiter.allowViewRecord(clientIp)) {
                writeRateLimited(response);
                return;
            }
        } else if (publicShareRoute) {
            if (!shareRateLimiter.allowPublicShare(clientIp)) {
                writeRateLimited(response);
                return;
            }
        } else if (downloadRoute) {
            String subject = request.getHeader("Authorization") != null
                ? "auth:" + request.getRemoteAddr()
                : "guest:" + request.getRemoteAddr();
            if (!shareRateLimiter.allowDownload(subject)) {
                writeRateLimited(response);
                return;
            }
        } else if (antibotRoute) {
            if (!shareRateLimiter.allowAntiBot(clientIp)) {
                writeRateLimited(response);
                return;
            }
        } else if (authWriteRoute || commentWriteRoute) {
            int limit = authWriteRoute ? AUTH_LIMIT : COMMENT_LIMIT;
            String userKey = request.getHeader("Authorization") != null ? "auth-user" : "guest";
            String key = request.getRemoteAddr() + ":" + userKey + ":" + uri;
            if (!allowRequest(key, limit)) {
                writeRateLimited(response);
                return;
            }
        }
        filterChain.doFilter(request, response);
    }

    private static boolean isAntiBotRoute(String uri, String method) {
        if (!"POST".equals(method)) {
            return false;
        }
        return uri.equals("/api/risk/evaluate")
            || uri.equals("/api/captcha/verify")
            || uri.equals("/api/fingerprint/register")
            || uri.equals("/api/behavior/track")
            || uri.equals("/api/trust/evaluate");
    }

    private void writeRateLimited(HttpServletResponse response) throws IOException {
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType("application/json");
        ApiResponse<Void> payload = ApiResponse.failure(
            ApiError.of(
                HttpStatus.TOO_MANY_REQUESTS.value(),
                "RATE_LIMITED",
                "Bạn thao tác quá nhanh, vui lòng thử lại sau"
            )
        );
        response.getWriter().write(objectMapper.writeValueAsString(payload));
    }

    private boolean allowRequest(String key, int limit) {
        long now = Instant.now().getEpochSecond();
        Counter counter = counters.computeIfAbsent(key, ignored -> new Counter(now, 0));
        synchronized (counter) {
            if (now - counter.windowStart >= WINDOW_SECONDS) {
                counter.windowStart = now;
                counter.requestCount = 0;
            }
            counter.requestCount++;
            return counter.requestCount <= limit;
        }
    }

    private static class Counter {
        private long windowStart;
        private int requestCount;

        private Counter(long windowStart, int requestCount) {
            this.windowStart = windowStart;
            this.requestCount = requestCount;
        }
    }
}
