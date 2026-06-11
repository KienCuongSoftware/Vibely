package com.vibely.backend.notification;

public record NotificationActorResponse(
    Long id,
    String username,
    String displayName,
    String avatarUrl
) {
}
