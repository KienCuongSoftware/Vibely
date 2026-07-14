package com.vibely.backend.contentunderstanding;

import java.util.List;
import java.util.Map;

public record CuClaimResponse(
    String jobId,
    Long videoId,
    String videoPublicId,
    String videoUrl,
    String thumbnailUrl,
    String title,
    String description,
    String audioTitle,
    String modelBundleVersion,
    int attempts,
    String triggerReason
) {
}
