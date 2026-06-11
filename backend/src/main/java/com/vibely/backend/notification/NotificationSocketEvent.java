package com.vibely.backend.notification;

public record NotificationSocketEvent(
    String type,
    Object payload,
    long unreadCount
) {}
