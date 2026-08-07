package com.vibely.backend.studio;

import java.util.List;

public record StudioAnalyticsOverviewResponse(
    int days,
    long totalViews,
    long totalLikes,
    long totalComments,
    long totalProfileViews,
    List<StudioAnalyticsPointResponse> points,
    List<StudioLatestCommentResponse> latestComments
) {}
