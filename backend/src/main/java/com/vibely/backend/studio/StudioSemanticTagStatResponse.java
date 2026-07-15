package com.vibely.backend.studio;

/** CU semantic tag attached to a Studio video (analytics surface). */
public record StudioSemanticTagStatResponse(
    String slug,
    String name,
    float confidence
) {
}
