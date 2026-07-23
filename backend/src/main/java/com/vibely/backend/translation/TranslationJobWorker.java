package com.vibely.backend.translation;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(prefix = "app.translation", name = "enabled", havingValue = "true")
@ConditionalOnProperty(prefix = "app.translation.worker", name = "enabled", havingValue = "true", matchIfMissing = true)
public class TranslationJobWorker {

    private static final Logger log = LoggerFactory.getLogger(TranslationJobWorker.class);

    private final DescriptionTranslationService translationService;

    public TranslationJobWorker(DescriptionTranslationService translationService) {
        this.translationService = translationService;
        log.info("TranslationJobWorker started");
    }

    @Scheduled(fixedDelayString = "${app.translation.poll-interval-ms:3000}", initialDelayString = "10000")
    public void poll() {
        try {
            translationService.processNextJob();
        } catch (Exception ex) {
            log.warn("Translation worker poll failed: {}", ex.getMessage());
        }
    }
}
