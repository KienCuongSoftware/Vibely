package com.vibely.backend.search.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SearchHistoryCreateRequest(
    @NotBlank(message = "query is required")
    @Size(max = 200, message = "query must be at most 200 characters")
    String query
) {
}
