package com.vibely.backend.enhancement;

import java.util.UUID;

public record EnhanceClaimResponse(
    String jobId,
    Long videoId,
    String videoPublicId,
    Long authorId,
    String videoUrl,
    String targetProfile,
    String enhancementLevel,
    String engine,
    String stagingPrefix,
    Integer sourceWidthPx,
    Integer sourceHeightPx,
    int attempts,
    String checkpointJson
) {}
