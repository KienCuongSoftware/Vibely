package com.vibely.backend.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

class StompDestinationInterceptorTest {

    private StompDestinationInterceptor interceptor;
    private MessageChannel channel;

    @BeforeEach
    void setUp() {
        interceptor = new StompDestinationInterceptor();
        channel = mock(MessageChannel.class);
    }

    @Test
    void allowsChatAndNotificationQueues() {
        assertThat(interceptor.preSend(subscribe("/user/queue/chat.messages"), channel)).isNotNull();
        assertThat(interceptor.preSend(subscribe("/user/queue/notifications"), channel)).isNotNull();
    }

    @Test
    void rejectsBrokerTopicSubscribe() {
        assertThatThrownBy(() -> interceptor.preSend(subscribe("/topic/admin"), channel))
            .isInstanceOf(MessagingException.class);
    }

    @Test
    void rejectsSendOutsideAppPrefix() {
        assertThatThrownBy(() -> interceptor.preSend(send("/topic/admin"), channel))
            .isInstanceOf(MessagingException.class);
    }

    @Test
    void allowsSendToAppPrefix() {
        assertThat(interceptor.preSend(send("/app/ping"), channel)).isNotNull();
    }

    private static Message<byte[]> subscribe(String destination) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination(destination);
        accessor.setLeaveMutable(true);
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }

    private static Message<byte[]> send(String destination) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SEND);
        accessor.setDestination(destination);
        accessor.setLeaveMutable(true);
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }
}
