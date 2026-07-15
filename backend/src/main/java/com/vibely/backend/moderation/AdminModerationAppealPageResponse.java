package com.vibely.backend.moderation;

import java.util.List;

public record AdminModerationAppealPageResponse(
    List<AdminModerationAppealItemResponse> items,
    long total,
    int page,
    int size,
    boolean hasNext
) {
}
