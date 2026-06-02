package com.vibely.backend.search.dto;

import java.time.LocalDateTime;

public record SearchTrendItemDto(
    String keyword,
    long searchCount,
    LocalDateTime lastSearchedAt
) {
}
