package com.vibely.backend.live.media.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;
import java.util.List;

/**
 * Viewer WHEP endpoint. {@code whepUrl} is only present while the host is publishing and carries a
 * short-lived play token bound to this viewer and this media session.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record LivePlaybackResponse(
    String type,
    String status,
    boolean publishing,
    String whepUrl,
    List<LiveIceServer> iceServers,
    Instant expiresAt
) {}
