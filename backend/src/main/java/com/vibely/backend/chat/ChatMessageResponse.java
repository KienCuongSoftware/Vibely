package com.vibely.backend.chat;

import java.time.LocalDateTime;

public record ChatMessageResponse(
    Long id,
    Long conversationId,
    Long senderId,
    String senderUsername,
    String senderDisplayName,
    String senderAvatarUrl,
    String content,
    LocalDateTime createdAt,
    boolean mine
) {}
