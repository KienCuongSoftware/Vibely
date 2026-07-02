package com.vibely.backend.user.dto;

import java.util.List;

public record UserFollowListResponse(
    List<UserFollowListItemResponse> items,
    boolean hasNext,
    int page,
    int size
) {}
