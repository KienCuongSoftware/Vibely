package com.vibely.backend.moderation;

import java.util.List;

public record AdminModerationQueuePageResponse(
    List<AdminModerationQueueItemResponse> items,
    long total,
    int page,
    int size,
    boolean hasNext
) {
}
