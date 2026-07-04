package com.vibely.backend.user.dto;

public record PublicUserProfileResponse(
    Long id,
    String username,
    String displayName,
    String bio,
    String avatarUrl,
    long followingCount,
    long followerCount,
    long totalLikeCount,
    long totalViewCount,
    boolean privateAccount,
    boolean contentVisible,
    boolean followedByViewer,
    boolean followRequestPending
) {
}
