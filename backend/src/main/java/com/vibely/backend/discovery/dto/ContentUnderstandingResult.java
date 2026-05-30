package com.vibely.backend.discovery.dto;

import java.util.List;

public record ContentUnderstandingResult(
    List<ScoredTopic> topics,
    List<String> semanticTags,
    List<ScoredCategorySlug> categoryScores,
    double confidence,
    String rawJson,
    String source
) {
    public record ScoredTopic(String name, double score) {
    }

    public record ScoredCategorySlug(String slug, double score) {
    }
}
