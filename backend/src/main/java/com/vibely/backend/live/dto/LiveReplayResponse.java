package com.vibely.backend.live.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Replay of an ended LIVE. The replay is a regular video: {@code videoId} identifies it for the
 * existing video pages, and {@code playbackUrl} is a short-lived signed URL (never stored).
 * {@code published} is false while the video is still a host-only draft.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record LiveReplayResponse(
    UUID liveId,
    String title,
    String status,
    boolean isOwner,
    boolean published,
    UUID videoId,
    String authorUsername,
    String playbackUrl,
    String thumbnailUrl,
    Integer durationSeconds,
    Instant expiresAt,
    LocalDateTime liveStartedAt,
    LocalDateTime liveEndedAt,
    String failureReason
) {}
