package com.vibely.backend.explore.service;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "app.explore.category-ensure.enabled", havingValue = "true", matchIfMissing = true)
public class VideoExploreCategoryEnsureScheduler {

    private final VideoExploreCategoryEnsureService ensureService;

    public VideoExploreCategoryEnsureScheduler(VideoExploreCategoryEnsureService ensureService) {
        this.ensureService = ensureService;
    }

    @Scheduled(
        fixedDelayString = "${app.explore.category-ensure.interval-ms:120000}",
        initialDelayString = "60000"
    )
    public void ensureMissingCategories() {
        ensureService.backfillMissing(100);
    }
}
