package com.vibely.backend.studio;

import java.time.Instant;
import java.util.UUID;

/** Một bình luận trên bất kỳ video nào của kênh (trang Studio → Bình luận). */
public record StudioCommentResponse(
    Long id,
    Long parentCommentId,
    String parentUsername,
    String content,
    Instant createdAt,
    Long userId,
    String username,
    String displayName,
    String avatarUrl,
    long followerCount,
    long likeCount,
    boolean likedByViewer,
    boolean fromCreator,
    boolean repliedByCreator,
    long replyCount,
    UUID videoPublicId,
    String videoTitle,
    String videoDescription,
    String videoThumbnailUrl
) {}
