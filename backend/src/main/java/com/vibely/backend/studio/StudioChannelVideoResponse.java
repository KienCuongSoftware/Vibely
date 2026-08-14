package com.vibely.backend.studio;

import java.time.LocalDateTime;
import java.util.UUID;

public record StudioChannelVideoResponse(
    UUID publicId,
    String title,
    String description,
    String thumbnailUrl,
    Integer durationSeconds,
    LocalDateTime createdAt,
    long views,
    long likes,
    long comments,
    long shares
) {}
