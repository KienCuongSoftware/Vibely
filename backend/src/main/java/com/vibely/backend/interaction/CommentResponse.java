package com.vibely.backend.interaction;

import java.time.LocalDateTime;

public record CommentResponse(
    Long id,
    Long userId,
    String username,
    String content,
    LocalDateTime createdAt
) {
}
