package com.vibely.backend.share.dto;

public record ShareVideoResponse(
    long videoId,
    String shortCode,
    String shortUrl,
    String watchUrl,
    String embedUrl,
    String deepLink,
    long shareCount
) {}
