package com.vibely.backend.explore;

import java.time.LocalDateTime;
import java.util.UUID;

public interface ExploreVideoProjection {
    Long getId();
    UUID getPublicId();
    String getTitle();
    String getDescription();
    String getVideoUrl();
    String getThumbnailUrl();
    String getMasterPlaylistUrl();
    Long getShareCount();
    LocalDateTime getCreatedAt();
    Double getExploreScore();
    Long getAuthorId();
    String getAuthorUsername();
    String getAuthorDisplayName();
    String getAuthorAvatarUrl();
}
