package com.vibely.backend.live.dto;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * LIVE metadata for clients. Deliberately has no ingest/stream credentials. {@code playback} is
 * {@code {"type":"webrtc"}} while real media (SRS) is enabled and the LIVE is upcoming or live, null
 * otherwise; endpoints and tokens are issued separately per request.
 */
public record LiveResponse(
    UUID id,
    String title,
    String description,
    String category,
    String coverUrl,
    String status,
    String visibility,
    boolean allowComments,
    boolean allowGifts,
    boolean allowGuests,
    boolean matureContent,
    boolean giftsAvailable,
    long viewerCount,
    long peakViewerCount,
    long likeCount,
    LocalDateTime startedAt,
    LocalDateTime endedAt,
    LocalDateTime createdAt,
    LiveUserResponse host,
    boolean isOwner,
    boolean isFollowing,
    boolean canModerate,
    Object playback
) {}
