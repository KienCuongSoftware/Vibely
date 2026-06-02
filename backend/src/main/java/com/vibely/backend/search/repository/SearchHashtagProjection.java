package com.vibely.backend.search.repository;

public interface SearchHashtagProjection {
    Long getId();

    String getTag();

    Long getUsageCount();
}
