package com.vibely.backend.live.dto;

/** @param publishing whether the host stream is on the media server; null when real media is disabled */
public record LiveStatsResponse(String status, long viewerCount, long peakViewerCount, long likeCount, Boolean publishing) {}
