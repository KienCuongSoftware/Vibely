package com.vibely.backend.publicstats;

import java.time.Instant;

public record PublicPlatformStatsResponse(
    long activeUsers,
    long publishedVideos,
    long totalViews,
    int supportedLocales,
    String apiStatus,
    Instant generatedAt
) {
}
