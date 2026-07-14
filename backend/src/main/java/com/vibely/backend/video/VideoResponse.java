package com.vibely.backend.video;

import java.time.LocalDateTime;
import java.util.UUID;

public record VideoResponse(
    UUID publicId,
    Long authorId,
    String authorUsername,
    String authorDisplayName,
    String authorAvatarUrl,
    String title,
    String description,
    String videoUrl,
    String thumbnailUrl,
    String audioUrl,
    String audioTitle,
    long likeCount,
    long commentCount,
    long bookmarkCount,
    long shareCount,
    long viewCount,
    LocalDateTime createdAt,
    VideoStatus status,
    String masterPlaylistUrl,
    Integer durationSeconds,
    Integer sourceWidthPx,
    Integer sourceHeightPx,
    String processingError,
    boolean followedByViewer,
    /** PUBLIC | FRIENDS | PRIVATE */
    String privacy,
    /** Set when this Following-feed item is a repost by someone the viewer follows. */
    Long repostedByUserId,
    String repostedByUsername,
    String repostedByDisplayName,
    String repostedByAvatarUrl,
    LocalDateTime repostedAt
) {
}
