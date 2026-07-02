package com.vibely.backend.user.dto;

public record UserFollowListItemResponse(
    Long id,
    String username,
    String displayName,
    String avatarUrl,
    boolean followedByViewer,
    boolean self
) {}
