package com.vibely.backend.live.dto;

/** Server features the Go LIVE screen and players adapt to; all are configuration toggles. */
public record LiveCapabilitiesResponse(
    boolean media,
    boolean recording,
    boolean hlsFallback,
    int maxDurationMinutes,
    int maxReplaySeconds
) {}
