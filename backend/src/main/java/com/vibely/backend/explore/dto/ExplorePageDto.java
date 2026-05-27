package com.vibely.backend.explore.dto;

import java.util.List;

public record ExplorePageDto(
    List<ExploreVideoCardDto> items,
    String nextCursor,
    boolean hasNext
) {
}
