package com.vibely.backend.search.dto;

public record SearchUserResultDto(
    Long id,
    String username,
    String displayName,
    String avatarUrl,
    int matchScore
) {
}
