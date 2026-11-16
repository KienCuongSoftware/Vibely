package com.vibely.backend.admin;

import java.util.List;

public record AdminDashboardResponse(
    int days,
    Totals totals,
    StatusMix statusMix,
    List<DayPoint> series
) {
    public record Totals(
        long users,
        long videos,
        long reports,
        long views
    ) {}

    public record StatusMix(
        long published,
        long draft,
        long flagged,
        long removed
    ) {}

    public record DayPoint(
        String day,
        long newUsers,
        long newVideos,
        long reports,
        long views,
        long totalUsers,
        long totalVideos
    ) {}
}
