package com.vibely.backend.processing;

/**
 * Immutable snapshot passed from the DB transaction into the FFmpeg runner (no lazy Hibernate access).
 */
public record VideoPipelineWorkItem(
    long jobId,
    long videoId,
    long authorId,
    String rawVideoUrl,
    String existingThumbnailUrl
) {
}
