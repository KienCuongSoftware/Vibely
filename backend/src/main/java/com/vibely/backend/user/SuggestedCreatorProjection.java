package com.vibely.backend.user;

public interface SuggestedCreatorProjection {
    Long getId();

    String getUsername();

    String getDisplayName();

    Long getVideoCount();

    Long getFollowerCount();

    String getPreviewThumbnailUrl();

    String getPreviewVideoUrl();
}
