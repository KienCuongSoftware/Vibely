package com.vibely.backend.security;

import jakarta.servlet.http.HttpServletRequest;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
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

    public WebSocketJwtHandshakeInterceptor(JwtService jwtService) {
        this.jwtService = jwtService;
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

    private String extractToken(ServerHttpRequest request) {
        List<String> authHeaders = request.getHeaders().get("Authorization");
        if (authHeaders != null && !authHeaders.isEmpty()) {
            String bearer = authHeaders.get(0);
            if (bearer.startsWith("Bearer ")) {
                return bearer.substring(7);
            }
        }

        if (request instanceof ServletServerHttpRequest servletRequest) {
            HttpServletRequest raw = servletRequest.getServletRequest();
            String token = raw.getParameter("token");
            if (token != null && !token.isBlank()) return token;
        }

        String query = request.getURI().getRawQuery();
        if (query == null || query.isBlank()) return null;
        String[] pairs = query.split("&");
        for (String pair : pairs) {
            int idx = pair.indexOf('=');
            if (idx < 0) continue;
            String key = URLDecoder.decode(pair.substring(0, idx), StandardCharsets.UTF_8);
            if (!"token".equals(key)) continue;
            return URLDecoder.decode(pair.substring(idx + 1), StandardCharsets.UTF_8);
        }
        return null;
    }
}
