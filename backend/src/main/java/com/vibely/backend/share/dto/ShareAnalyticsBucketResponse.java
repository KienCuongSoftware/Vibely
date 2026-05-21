package com.vibely.backend.share.dto;

public record ShareAnalyticsBucketResponse(
    String eventType,
    String channel,
    String countryCode,
    String deviceClass,
    long eventCount
) {}
