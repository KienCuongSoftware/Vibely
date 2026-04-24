package com.vibely.backend.security;

import com.vibely.backend.common.ApiError;
import com.vibely.backend.common.ApiResponse;
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

    public RateLimitFilter(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException {
        String uri = request.getRequestURI();
        String method = request.getMethod();
        boolean authRoute = uri.startsWith("/api/auth/");
        boolean commentWriteRoute = uri.matches("^/api/videos/\\d+/comments$") && "POST".equals(method);

        if (authRoute || commentWriteRoute) {
            int limit = authRoute ? AUTH_LIMIT : COMMENT_LIMIT;
            String userKey = request.getHeader("Authorization") != null ? "auth-user" : "guest";
            String key = request.getRemoteAddr() + ":" + userKey + ":" + uri;
            if (!allowRequest(key, limit)) {
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
                return;
            }
        }
        filterChain.doFilter(request, response);
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
