package com.vibely.backend.studio;

import java.util.List;

public record StudioCommentPageResponse(
    List<StudioCommentResponse> items,
    int page,
    int size,
    long total,
    boolean hasNext
) {}
