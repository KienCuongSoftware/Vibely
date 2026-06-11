package com.vibely.backend.notification;

import java.time.LocalDateTime;

public record SystemNotificationItemResponse(
    Long id,
    SystemNotificationCategory category,
    String badge,
    String title,
    String body,
    LocalDateTime createdAt
) {
}
