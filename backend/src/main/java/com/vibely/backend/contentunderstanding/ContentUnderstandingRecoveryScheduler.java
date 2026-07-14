package com.vibely.backend.contentunderstanding;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(prefix = "app.content-understanding", name = "enabled", havingValue = "true", matchIfMissing = true)
public class ContentUnderstandingRecoveryScheduler {

    private final ContentUnderstandingJobService jobService;
    private final ContentUnderstandingProperties properties;

    public ContentUnderstandingRecoveryScheduler(
        ContentUnderstandingJobService jobService,
        ContentUnderstandingProperties properties
    ) {
        this.jobService = jobService;
        this.properties = properties;
    }

    @Scheduled(fixedDelayString = "${app.content-understanding.recovery.interval-ms:60000}", initialDelayString = "50000")
    public void recover() {
        if (!properties.getRecovery().isEnabled()) {
            return;
        }
        jobService.recoverStaleJobs();
    }
}
