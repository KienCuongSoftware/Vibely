package com.vibely.backend.live.media.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;
import java.util.List;

/**
 * Viewer WHEP endpoint. {@code whepUrl} is only present while the host is publishing and carries a
 * short-lived play token bound to this viewer and this media session. {@code hlsUrl} (HLS fallback,
 * when enabled) carries a playlist token scoped to HLS and to this media session.
 * {@code interrupted} is true while the host's stream dropped and the reconnect grace period runs.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record LivePlaybackResponse(
    String type,
    String status,
    boolean publishing,
    String whepUrl,
    List<LiveIceServer> iceServers,
    Instant expiresAt,
    boolean interrupted,
    String hlsUrl
) {}
