package com.vibely.backend.studio;

public record StudioInspirationCreatorResponse(
    int rank,
    Long id,
    String username,
    String displayName,
    String avatarUrl,
    long videoCount,
    long followerCount,
    String previewThumbnailUrl,
    String previewVideoUrl,
    boolean followedByViewer
) {
}
