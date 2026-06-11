package com.vibely.backend.notification;

import java.util.List;

public record SystemNotificationPageResponse(
    List<SystemNotificationItemResponse> items,
    String nextCursor,
    boolean hasNext
) {
}
