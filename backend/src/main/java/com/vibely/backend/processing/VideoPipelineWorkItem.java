package com.vibely.backend.processing;

import java.util.UUID;

/**
 * Immutable snapshot passed from the DB transaction into the FFmpeg runner (no lazy Hibernate access).
 */
public record VideoPipelineWorkItem(
    long jobId,
    long videoId,
    UUID videoPublicId,
    long authorId,
    String authorUsername,
    String rawVideoUrl,
    String existingThumbnailUrl
) {
}
