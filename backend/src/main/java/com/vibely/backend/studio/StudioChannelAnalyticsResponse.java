package com.vibely.backend.studio;

import java.util.List;

public record StudioChannelAnalyticsResponse(
    int days,
    long totalViews,
    long totalProfileViews,
    long totalLikes,
    long totalComments,
    long totalShares,
    long totalFollowers,
    long newFollowers,
    long publishedVideoCount,
    long periodPublishedVideoCount,
    List<StudioChannelPointResponse> points,
    List<StudioChannelVideoResponse> topVideos,
    List<StudioTrafficSourceResponse> trafficSources,
    List<StudioSearchKeywordResponse> searchKeywords,
    List<StudioAudienceSliceResponse> followerRegions,
    List<StudioAudienceSliceResponse> followerAgeBuckets
) {}
