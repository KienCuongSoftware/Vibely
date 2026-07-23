package com.vibely.backend.translation;

public record DescriptionTranslationResponse(
    String status,
    String original,
    String translated,
    String sourceLang,
    String targetLang,
    Long jobId,
    String message
) {
    public static DescriptionTranslationResponse ready(
        String original,
        String translated,
        String sourceLang,
        String targetLang
    ) {
        return new DescriptionTranslationResponse(
            "READY",
            original,
            translated,
            sourceLang,
            targetLang,
            null,
            null
        );
    }

    public static DescriptionTranslationResponse pending(Long jobId, String original, String sourceLang, String targetLang) {
        return new DescriptionTranslationResponse(
            "PENDING",
            original,
            null,
            sourceLang,
            targetLang,
            jobId,
            null
        );
    }

    public static DescriptionTranslationResponse skipped(
        String original,
        String sourceLang,
        String targetLang,
        String message
    ) {
        return new DescriptionTranslationResponse(
            "SKIPPED",
            original,
            null,
            sourceLang,
            targetLang,
            null,
            message
        );
    }

    public static DescriptionTranslationResponse disabled() {
        return new DescriptionTranslationResponse(
            "DISABLED",
            null,
            null,
            null,
            null,
            null,
            "Translation service is disabled"
        );
    }

    public static DescriptionTranslationResponse failed(String message) {
        return new DescriptionTranslationResponse(
            "FAILED",
            null,
            null,
            null,
            null,
            null,
            message
        );
    }
}
