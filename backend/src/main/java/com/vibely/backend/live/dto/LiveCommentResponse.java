package com.vibely.backend.live.dto;

import java.time.LocalDateTime;

public record LiveCommentResponse(
    Long id,
    String content,
    LiveUserResponse author,
    LocalDateTime createdAt,
    String clientId
) {}
