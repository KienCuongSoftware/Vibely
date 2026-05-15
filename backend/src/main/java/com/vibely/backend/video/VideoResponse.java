package com.vibely.backend.video;

import java.time.LocalDateTime;

public record VideoResponse(
    Long id,
    Long authorId,
    String authorUsername,
    String authorDisplayName,
    String authorAvatarUrl,
    String title,
    String description,
    String videoUrl,
    String thumbnailUrl,
    String audioUrl,
    String audioTitle,
    long likeCount,
    long commentCount,
    long bookmarkCount,
    long shareCount,
    long viewCount,
    LocalDateTime createdAt,
    VideoStatus status,
    String masterPlaylistUrl,
    Integer durationSeconds,
    Integer sourceWidthPx,
    Integer sourceHeightPx,
    String processingError
) {
}
