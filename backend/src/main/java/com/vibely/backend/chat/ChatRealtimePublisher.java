package com.vibely.backend.chat;

import java.util.List;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

@Component
public class ChatRealtimePublisher {

    private final SimpMessagingTemplate messagingTemplate;

    public ChatRealtimePublisher(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void publishNewMessage(List<String> participantEmails, ChatMessageResponse message) {
        ChatSocketEvent event = new ChatSocketEvent("message.created", message);
        for (String email : participantEmails) {
            messagingTemplate.convertAndSendToUser(email, "/queue/chat.messages", event);
        }
    }
}
