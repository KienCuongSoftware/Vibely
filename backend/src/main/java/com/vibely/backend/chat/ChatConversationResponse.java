package com.vibely.backend.chat;

import java.time.LocalDateTime;

public record ChatConversationResponse(
    Long id,
    boolean direct,
    Long peerUserId,
    String peerUsername,
    String peerDisplayName,
    String peerAvatarUrl,
    String lastMessage,
    LocalDateTime lastMessageAt,
    long unreadCount,
    boolean messageRequest,
    boolean canSendMessage,
    boolean canAcceptMessageRequest
) {}
