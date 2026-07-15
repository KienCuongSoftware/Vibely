package com.vibely.backend.contentunderstanding;

import java.util.Map;

public record VideoSemanticTagResponse(
    String slug,
    String name,
    float confidence,
    String source,
    String reason,
    String modelVersion,
    Map<String, Object> evidence
) {
}
