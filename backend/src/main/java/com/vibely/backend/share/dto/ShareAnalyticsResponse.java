package com.vibely.backend.share.dto;

import java.util.List;

public record ShareAnalyticsResponse(
    long videoId,
    long totalShareEvents,
    long totalLinkClicks,
    long uniqueVisitors,
    long shareCount,
    List<ShareAnalyticsBucketResponse> buckets
) {}
