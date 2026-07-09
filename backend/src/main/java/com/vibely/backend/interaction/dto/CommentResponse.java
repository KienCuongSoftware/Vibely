package com.vibely.backend.interaction.dto;

import java.time.Instant;

public record CommentResponse(
    Long id,
    Long userId,
    String username,
    String content,
    Instant createdAt,
    String authorAvatarUrl,
    Long parentCommentId,
    long likeCount,
    boolean likedByViewer
) {
}
