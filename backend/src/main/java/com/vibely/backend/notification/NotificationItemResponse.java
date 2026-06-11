package com.vibely.backend.notification;

import java.time.LocalDateTime;
import java.util.UUID;

public record NotificationItemResponse(
    Long id,
    NotificationType type,
    NotificationActorResponse actor,
    String preview,
    UUID videoPublicId,
    String videoAuthorUsername,
    String videoThumbnailUrl,
    Long commentId,
    boolean viewerFollowsActor,
    boolean read,
    int actorCount,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
}
