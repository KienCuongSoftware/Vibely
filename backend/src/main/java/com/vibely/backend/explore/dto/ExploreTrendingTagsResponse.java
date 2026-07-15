package com.vibely.backend.explore.dto;

import java.util.List;

public record ExploreTrendingTagsResponse(
    int windowDays,
    List<ExploreTrendingTagDto> items
) {
}
