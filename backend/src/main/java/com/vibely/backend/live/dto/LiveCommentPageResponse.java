package com.vibely.backend.live.dto;

import java.util.List;

/** Comments in chronological order (oldest first). */
public record LiveCommentPageResponse(List<LiveCommentResponse> items, boolean hasMore) {}
