package com.vibely.backend.admin;

import java.util.List;

public record AdminBanAppealPageResponse(
    List<AdminBanAppealResponse> items,
    long total,
    int page,
    int size,
    boolean hasNext
) {
}
