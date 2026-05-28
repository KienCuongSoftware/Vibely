package com.vibely.backend.chat;

import java.util.List;

public record ChatConversationListResponse(
    List<ChatConversationResponse> items
) {}
