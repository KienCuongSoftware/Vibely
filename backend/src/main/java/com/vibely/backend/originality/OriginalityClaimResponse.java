package com.vibely.backend.originality;

import java.util.UUID;

public record OriginalityClaimResponse(
    long jobId,
    long videoId,
    UUID videoPublicId,
    long authorId,
    String videoUrl,
    String thumbnailUrl,
    Integer durationSeconds,
    String title,
    String description,
    String policyVersion,
    int attempt
) {
}
