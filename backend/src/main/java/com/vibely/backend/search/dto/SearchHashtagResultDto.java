package com.vibely.backend.search.dto;

public record SearchHashtagResultDto(
    Long id,
    String tag,
    long usageCount
) {
}
