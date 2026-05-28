package com.vibely.backend.security;

import java.security.Principal;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.lang.NonNull;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.support.DefaultHandshakeHandler;

public class WebSocketUserHandshakeHandler extends DefaultHandshakeHandler {

    @Override
    protected Principal determineUser(
        @NonNull ServerHttpRequest request,
        @NonNull WebSocketHandler wsHandler,
        @NonNull Map<String, Object> attributes
    ) {
        Object userEmail = attributes.get("ws-user-email");
        String name = userEmail instanceof String email && !email.isBlank()
            ? email
            : "ws-anonymous-" + UUID.randomUUID();
        return () -> name;
    }
}
