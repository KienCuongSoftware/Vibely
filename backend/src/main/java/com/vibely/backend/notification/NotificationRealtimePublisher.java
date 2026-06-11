package com.vibely.backend.notification;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

@Component
public class NotificationRealtimePublisher {

    private final SimpMessagingTemplate messagingTemplate;

    public NotificationRealtimePublisher(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void publishUpdated(String recipientEmail, NotificationItemResponse item, long unreadCount) {
        NotificationSocketEvent event = new NotificationSocketEvent("notification.updated", item, unreadCount);
        messagingTemplate.convertAndSendToUser(recipientEmail, "/queue/notifications", event);
    }

    public void publishRemoved(String recipientEmail, long notificationId, long unreadCount) {
        NotificationSocketEvent event = new NotificationSocketEvent(
            "notification.removed",
            new NotificationRemovedPayload(notificationId),
            unreadCount
        );
        messagingTemplate.convertAndSendToUser(recipientEmail, "/queue/notifications", event);
    }

    private record NotificationRemovedPayload(long id) {}
}
