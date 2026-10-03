package com.vibely.backend.live.dto;

import com.vibely.backend.live.entity.LiveAnalytics;
import java.util.UUID;

public record LiveAnalyticsResponse(
    UUID liveId,
    long durationSeconds,
    long uniqueViewers,
    long totalWatchSeconds,
    long averageWatchSeconds,
    double averageViewers,
    long peakViewers,
    long likeCount,
    long commentCount,
    int reconnectCount,
    String endReason
) {
    public static LiveAnalyticsResponse from(UUID liveId, LiveAnalytics analytics) {
        return new LiveAnalyticsResponse(
            liveId,
            analytics.getDurationSeconds(),
            analytics.getUniqueViewers(),
            analytics.getTotalWatchSeconds(),
            analytics.getAverageWatchSeconds(),
            Math.round(analytics.getAverageViewers() * 100.0) / 100.0,
            analytics.getPeakViewers(),
            analytics.getLikeCount(),
            analytics.getCommentCount(),
            analytics.getReconnectCount(),
            analytics.getEndReason()
        );
    }
}
