package com.vibely.backend.share.dto;

import java.util.UUID;

public record ShareVideoResponse(
    UUID publicId,
    String shortCode,
    String shortUrl,
    String watchUrl,
    String embedUrl,
    String deepLink,
    long shareCount
) {}
