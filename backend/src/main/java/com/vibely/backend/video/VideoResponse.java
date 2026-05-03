package com.vibely.backend.video;

import java.time.LocalDateTime;

public record VideoResponse(
    Long id,
    Long authorId,
    String authorUsername,
    String authorDisplayName,
    String title,
    String description,
    String videoUrl,
    String thumbnailUrl,
    long likeCount,
    long commentCount,
    LocalDateTime createdAt
) {
}
