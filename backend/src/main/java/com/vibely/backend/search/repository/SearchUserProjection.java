package com.vibely.backend.search.repository;

public interface SearchUserProjection {
    Long getId();

    String getUsername();

    String getDisplayName();

    String getAvatarUrl();

    String getGoogleAvatarUrl();
}
