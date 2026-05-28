package com.vibely.backend.user;

public record SuggestedCreatorDto(
    Long id,
    String username,
    String displayName,
    String avatarUrl,
    long videoCount,
    long followerCount,
    String previewThumbnailUrl,
    String previewVideoUrl,
    boolean followedByViewer
) {}
