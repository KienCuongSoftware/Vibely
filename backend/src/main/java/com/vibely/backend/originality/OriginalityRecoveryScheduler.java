package com.vibely.backend.originality;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(prefix = "app.originality.recovery", name = "enabled", havingValue = "true", matchIfMissing = true)
public class OriginalityRecoveryScheduler {

    private static final Logger log = LoggerFactory.getLogger(OriginalityRecoveryScheduler.class);

    private final OriginalityJobService jobService;
    private final OriginalityProperties properties;

    public OriginalityRecoveryScheduler(
        OriginalityJobService jobService,
        OriginalityProperties properties
    ) {
        this.jobService = jobService;
        this.properties = properties;
    }

    @Scheduled(fixedDelayString = "${app.originality.recovery.interval-ms:60000}", initialDelayString = "45000")
    public void recover() {
        if (!properties.isEnabled()) {
            return;
        }
        try {
            jobService.recoverStaleProcessing();
        } catch (Exception e) {
            log.warn("Originality recovery failed: {}", e.toString());
        }
    }
}
