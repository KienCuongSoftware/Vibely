package com.vibely.backend.translation;

public record TranslateResult(
    String translatedText,
    String sourceLang,
    String targetLang,
    String model
) {
}
