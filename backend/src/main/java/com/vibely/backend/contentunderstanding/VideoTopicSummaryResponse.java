package com.vibely.backend.contentunderstanding;

public record VideoTopicSummaryResponse(
    String slug,
    String displayName,
    double score,
    String source
) {
}
