package com.vibely.backend.contentunderstanding;

public record VideoCategorySummaryResponse(
    String slug,
    String name,
    double score,
    String source
) {
}
