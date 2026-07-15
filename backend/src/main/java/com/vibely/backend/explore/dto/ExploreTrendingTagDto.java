package com.vibely.backend.explore.dto;

public record ExploreTrendingTagDto(
    String slug,
    String name,
    long countRecent,
    long countPrev,
    double growthRate
) {
}
