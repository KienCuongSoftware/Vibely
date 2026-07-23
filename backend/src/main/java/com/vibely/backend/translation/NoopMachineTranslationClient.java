package com.vibely.backend.translation;

import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * No-op client when translation is disabled — keeps wiring optional.
 */
@Component
@ConditionalOnProperty(prefix = "app.translation", name = "enabled", havingValue = "false", matchIfMissing = true)
@ConditionalOnMissingBean(MachineTranslationClient.class)
public class NoopMachineTranslationClient implements MachineTranslationClient {

    @Override
    public DetectResult detect(String text) {
        return new DetectResult("und", 0);
    }

    @Override
    public TranslateResult translate(String text, String sourceLang, String targetLang) {
        throw new IllegalStateException("Translation service is disabled");
    }
}
