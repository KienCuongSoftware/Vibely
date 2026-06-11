package com.vibely.backend.notification;

import java.util.List;

public record NotificationPageResponse(
    List<NotificationItemResponse> items,
    String nextCursor,
    boolean hasNext,
    String systemInboxPreview
) {
}
