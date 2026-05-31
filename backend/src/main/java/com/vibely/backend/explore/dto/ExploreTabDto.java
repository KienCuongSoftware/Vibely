package com.vibely.backend.explore.dto;

public record ExploreTabDto(
    String slug,
    String name,
    String kind,
    boolean personalized,
    Long topicId,
    long videoCount
) {
}
