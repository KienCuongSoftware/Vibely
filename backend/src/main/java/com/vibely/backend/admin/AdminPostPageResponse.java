package com.vibely.backend.admin;

import java.util.List;

public record AdminPostPageResponse(
    List<AdminPostResponse> items,
    long total,
    int page,
    int size,
    boolean hasNext
) {
}
