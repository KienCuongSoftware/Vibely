package com.vibely.backend.live.dto;

public record LiveStatsResponse(String status, long viewerCount, long peakViewerCount, long likeCount) {}
