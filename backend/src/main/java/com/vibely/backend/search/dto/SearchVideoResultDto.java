package com.vibely.backend.search.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record SearchVideoResultDto(
    UUID publicId,
    String title,
    String description,
    String thumbnailUrl,
    String videoUrl,
    String masterPlaylistUrl,
    Long authorId,
    String authorUsername,
    String authorDisplayName,
    String authorAvatarUrl,
    long viewCount,
    long likeCount,
    LocalDateTime createdAt,
    double rankingScore
) {
}
