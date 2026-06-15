package com.vibely.backend.config;

import com.vibely.backend.security.WebSocketJwtHandshakeInterceptor;
import com.vibely.backend.security.WebSocketUserHandshakeHandler;
import java.util.ArrayList;
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
    private final List<String> allowedOriginPatterns;

    public WebSocketConfig(
        WebSocketJwtHandshakeInterceptor jwtHandshakeInterceptor,
        @Value("${app.cors.allowed-origins:}") String allowedOrigins,
        @Value("${app.cors.allowed-origin-patterns:}") String allowedOriginPatterns
    ) {
        this.jwtHandshakeInterceptor = jwtHandshakeInterceptor;
        var patterns = new ArrayList<String>();
        patterns.addAll(splitCsv(allowedOriginPatterns));
        patterns.addAll(splitCsv(allowedOrigins));
        this.allowedOriginPatterns = patterns;
    }

    private static List<String> splitCsv(String csv) {
        return Arrays.stream(csv.split(","))
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
        if (allowedOriginPatterns.isEmpty()) {
            endpoint.setAllowedOriginPatterns("http://localhost:*", "http://127.0.0.1:*");
        } else {
            endpoint.setAllowedOriginPatterns(allowedOriginPatterns.toArray(String[]::new));
        }
    }
}
