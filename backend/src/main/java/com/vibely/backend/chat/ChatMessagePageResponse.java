package com.vibely.backend.chat;

import java.util.List;

public record ChatMessagePageResponse(
    List<ChatMessageResponse> items,
    boolean hasNext,
    int page,
    int size
) {}
