package com.vibely.backend.search.dto;

import java.time.LocalDateTime;

public record SearchHistoryItemDto(
    Long id,
    String query,
    LocalDateTime createdAt
) {
}
