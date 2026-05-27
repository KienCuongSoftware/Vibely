package com.vibely.backend.explore.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record ExploreVideoCardDto(
    UUID publicId,
    Long authorId,
    String authorUsername,
    String authorDisplayName,
    String authorAvatarUrl,
    String title,
    String description,
    String videoUrl,
    String thumbnailUrl,
    String masterPlaylistUrl,
    long likeCount,
    long commentCount,
    long bookmarkCount,
    long shareCount,
    long viewCount,
    LocalDateTime createdAt,
    double exploreScore
) {
}
