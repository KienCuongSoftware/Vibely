package com.vibely.backend.user;

public record PublicUserProfileResponse(
    Long id,
    String username,
    String displayName,
    String bio,
    String avatarUrl,
    long followingCount,
    long followerCount,
    long totalLikeCount,
    long totalViewCount
) {
}
