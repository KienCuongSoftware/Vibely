package com.vibely.backend.security;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.http.server.ServletServerHttpResponse;
import org.springframework.lang.NonNull;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

@Component
public class WebSocketJwtHandshakeInterceptor implements HandshakeInterceptor {

    private final JwtService jwtService;
    private final AuthCookieService authCookieService;

    public WebSocketJwtHandshakeInterceptor(
        JwtService jwtService,
        AuthCookieService authCookieService
    ) {
        this.jwtService = jwtService;
        this.authCookieService = authCookieService;
    }

    @Override
    public boolean beforeHandshake(
        @NonNull ServerHttpRequest request,
        @NonNull ServerHttpResponse response,
        @NonNull WebSocketHandler wsHandler,
        @NonNull Map<String, Object> attributes
    ) {
        String token = extractToken(request);
        if (token == null || token.isBlank()) {
            if (response instanceof ServletServerHttpResponse servletResponse) {
                servletResponse.getServletResponse().setStatus(401);
            }
            return false;
        }

        try {
            if (!jwtService.isTokenValid(token)) {
                if (response instanceof ServletServerHttpResponse servletResponse) {
                    servletResponse.getServletResponse().setStatus(401);
                }
                return false;
            }
            String email = jwtService.extractSubject(token);
            attributes.put("ws-user-email", email);
            return true;
        } catch (RuntimeException ex) {
            if (response instanceof ServletServerHttpResponse servletResponse) {
                servletResponse.getServletResponse().setStatus(401);
            }
            return false;
        }
    }

    @Override
    public void afterHandshake(
        @NonNull ServerHttpRequest request,
        @NonNull ServerHttpResponse response,
        @NonNull WebSocketHandler wsHandler,
        @Nullable Exception exception
    ) {}

    /** Auth via httpOnly access cookie or Authorization header only (never query string). */
    private String extractToken(ServerHttpRequest request) {
        if (request instanceof ServletServerHttpRequest servletRequest) {
            HttpServletRequest raw = servletRequest.getServletRequest();
            var cookieToken = authCookieService.readAccessToken(raw);
            if (cookieToken.isPresent()) {
                return cookieToken.get();
            }
        }

        List<String> authHeaders = request.getHeaders().get("Authorization");
        if (authHeaders != null && !authHeaders.isEmpty()) {
            String bearer = authHeaders.get(0);
            if (bearer.startsWith("Bearer ")) {
                return bearer.substring(7);
            }
        }
        return null;
    }
}
