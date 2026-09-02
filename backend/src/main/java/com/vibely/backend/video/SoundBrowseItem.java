package com.vibely.backend.video;

public record SoundBrowseItem(
    String audioUrl,
    String audioTitle,
    String thumbnailUrl,
    int durationSeconds,
    String authorDisplayName,
    long usageCount
) {
}
