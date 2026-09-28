package com.vibely.backend.security;

import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.lang.NonNull;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

/** Restricts STOMP SUBSCRIBE/SEND destinations after the JWT handshake. */
@Component
public class StompDestinationInterceptor implements ChannelInterceptor {

    private static final Set<String> ALLOWED_SUBSCRIBE = Set.of(
        "/user/queue/chat.messages",
        "/user/queue/notifications"
    );

    /** LIVE room topics; per-LIVE authorization happens in LiveStompSubscriptionInterceptor. */
    private static final Pattern LIVE_TOPIC = Pattern.compile("^/topic/live/[0-9a-fA-F-]{36}$");

    @Override
    public Message<?> preSend(@NonNull Message<?> message, @NonNull MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) {
            return message;
        }
        StompCommand command = accessor.getCommand();
        if (command == StompCommand.SUBSCRIBE) {
            String destination = accessor.getDestination();
            if (destination == null
                || !(ALLOWED_SUBSCRIBE.contains(destination) || LIVE_TOPIC.matcher(destination).matches())) {
                throw new MessagingException("Subscription not allowed");
            }
        } else if (command == StompCommand.SEND) {
            String destination = accessor.getDestination();
            if (destination == null || !destination.startsWith("/app/")) {
                throw new MessagingException("Send not allowed");
            }
        }
        return message;
    }
}
