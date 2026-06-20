package com.vibely.backend.admin;

import com.vibely.backend.video.VideoStatus;
import java.time.LocalDateTime;
import java.util.UUID;

public record AdminPostResponse(
    UUID publicId,
    String title,
    String description,
    String thumbnailUrl,
    String videoUrl,
    VideoStatus status,
    Long authorId,
    String authorUsername,
    String authorDisplayName,
    String authorEmail,
    long likeCount,
    long commentCount,
    long bookmarkCount,
    long shareCount,
    long viewCount,
    LocalDateTime createdAt
) {
}
