package com.vibely.backend.live.media.dto;

import java.time.Instant;
import java.util.List;

/**
 * Host-only WHIP endpoint. {@code whipUrl} embeds a single-use publish token that expires at
 * {@code expiresAt}; a new one must be requested for every (re)connection attempt.
 *
 * @param activePublisher SRS currently holds a publisher for this LIVE (another tab/device, or this
 *                        host's previous connection that SRS has not timed out yet)
 */
public record LivePublishCredentialResponse(
    String whipUrl,
    List<LiveIceServer> iceServers,
    Instant expiresAt,
    boolean activePublisher
) {}
