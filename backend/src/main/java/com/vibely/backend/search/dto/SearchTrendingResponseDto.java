package com.vibely.backend.search.dto;

import java.util.List;

public record SearchTrendingResponseDto(
    List<SearchTrendItemDto> items
) {
}
