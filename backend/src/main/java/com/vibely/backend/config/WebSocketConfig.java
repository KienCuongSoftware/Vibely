package com.vibely.backend.config;

import com.vibely.backend.security.WebSocketJwtHandshakeInterceptor;
import com.vibely.backend.security.WebSocketUserHandshakeHandler;
import java.util.Arrays;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final WebSocketJwtHandshakeInterceptor jwtHandshakeInterceptor;
    private final List<String> allowedOrigins;

    public WebSocketConfig(
        WebSocketJwtHandshakeInterceptor jwtHandshakeInterceptor,
        @Value("${app.cors.allowed-origins:}") String allowedOrigins
    ) {
        this.jwtHandshakeInterceptor = jwtHandshakeInterceptor;
        this.allowedOrigins = Arrays.stream(allowedOrigins.split(","))
            .map(String::trim)
            .filter(value -> !value.isEmpty())
            .toList();
    }

    @Override
    public void configureMessageBroker(@NonNull MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic", "/queue");
        registry.setApplicationDestinationPrefixes("/app");
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(@NonNull StompEndpointRegistry registry) {
        var endpoint = registry
            .addEndpoint("/ws")
            .setHandshakeHandler(new WebSocketUserHandshakeHandler())
            .addInterceptors(jwtHandshakeInterceptor);
        if (allowedOrigins.isEmpty()) {
            endpoint.setAllowedOriginPatterns("http://localhost:*", "http://127.0.0.1:*");
        } else {
            endpoint.setAllowedOrigins(allowedOrigins.toArray(String[]::new));
        }
    }
}
