package com.vibely.backend.studio;

import java.util.UUID;

public record StudioInspirationVideoResponse(
    int rank,
    UUID publicId,
    Long authorId,
    String authorUsername,
    String authorDisplayName,
    String authorAvatarUrl,
    String title,
    String description,
    String thumbnailUrl,
    String videoUrl,
    long viewCount,
    long likeCount,
    boolean saved
) {
}
