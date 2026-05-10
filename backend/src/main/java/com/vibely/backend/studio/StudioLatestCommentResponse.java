package com.vibely.backend.studio;

import java.time.LocalDateTime;

public record StudioLatestCommentResponse(
    Long commentId,
    String commenterUsername,
    String videoTitle,
    String content,
    LocalDateTime createdAt
) {}
