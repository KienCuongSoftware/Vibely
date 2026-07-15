package com.vibely.backend.search.dto;

import java.util.List;

/** Phase 5 — NL semantic search (lexical + CU tag/alias expansion). */
public record SearchSemanticResponseDto(
    String query,
    List<String> matchedTags,
    List<SearchVideoResultDto> videos
) {
}
