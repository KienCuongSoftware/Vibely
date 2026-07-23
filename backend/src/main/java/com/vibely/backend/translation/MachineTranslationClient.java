package com.vibely.backend.translation;

public interface MachineTranslationClient {
    DetectResult detect(String text);

    TranslateResult translate(String text, String sourceLang, String targetLang);
}
