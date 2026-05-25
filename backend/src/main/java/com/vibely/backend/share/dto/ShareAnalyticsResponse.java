package com.vibely.backend.share.dto;

import java.util.List;
import java.util.UUID;

public record ShareAnalyticsResponse(
    UUID publicId,
    long totalShareEvents,
    long totalLinkClicks,
    long uniqueVisitors,
    long shareCount,
    List<ShareAnalyticsBucketResponse> buckets
) {}
