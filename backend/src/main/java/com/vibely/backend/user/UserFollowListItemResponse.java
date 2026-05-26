package com.vibely.backend.user;

public record UserFollowListItemResponse(
    Long id,
    String username,
    String displayName,
    String avatarUrl,
    boolean followedByViewer,
    boolean self
) {}
