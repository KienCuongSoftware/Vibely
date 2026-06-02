package com.vibely.backend.search.dto;

import java.util.List;

public record SearchSuggestResponseDto(
    List<SearchTrendItemDto> trending,
    List<SearchUserResultDto> users,
    List<SearchHashtagResultDto> hashtags,
    List<SearchVideoResultDto> videos
) {
}
