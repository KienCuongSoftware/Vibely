package com.vibely.backend.search.repository;

import java.time.LocalDateTime;

public interface SearchVideoProjection {
    Long getId();

    String getPublicId();

    String getTitle();

    String getDescription();

    String getThumbnailUrl();

    String getVideoUrl();

    String getMasterPlaylistUrl();

    LocalDateTime getCreatedAt();

    Long getAuthorId();

    String getAuthorUsername();

    String getAuthorDisplayName();

    String getAuthorAvatarUrl();

    Long getViewCount();

    Long getLikeCount();

    Boolean getTitleMatch();

    Boolean getDescriptionMatch();

    Boolean getHashtagMatch();
}
