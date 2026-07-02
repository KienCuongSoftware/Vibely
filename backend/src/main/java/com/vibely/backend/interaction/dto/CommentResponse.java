package com.vibely.backend.interaction.dto;

import java.time.LocalDateTime;

public record CommentResponse(
    Long id,
    Long userId,
    String username,
    String content,
    LocalDateTime createdAt,
    String authorAvatarUrl,
    Long parentCommentId,
    long likeCount,
    boolean likedByViewer
) {
}
