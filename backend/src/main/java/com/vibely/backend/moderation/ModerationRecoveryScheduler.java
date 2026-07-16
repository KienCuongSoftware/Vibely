package com.vibely.backend.moderation;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(prefix = "app.moderation", name = "enabled", havingValue = "true", matchIfMissing = true)
public class ModerationRecoveryScheduler {

    private static final Logger log = LoggerFactory.getLogger(ModerationRecoveryScheduler.class);

    private final ModerationJobService jobService;
    private final ModerationJoinService joinService;
    private final ModerationPublicationHoldService holdService;
    private final ModerationProperties properties;

    public ModerationRecoveryScheduler(
        ModerationJobService jobService,
        ModerationJoinService joinService,
        ModerationPublicationHoldService holdService,
        ModerationProperties properties
    ) {
        this.jobService = jobService;
        this.joinService = joinService;
        this.holdService = holdService;
        this.properties = properties;
    }

    @Scheduled(fixedDelayString = "${app.moderation.recovery.interval-ms:60000}", initialDelayString = "20000")
    public void recover() {
        if (!properties.getRecovery().isEnabled()) {
            return;
        }
        try {
            jobService.recoverStaleProcessing();
            joinService.reconcileSoftTimeouts();
            joinService.reconcileMissingModerationJobs();
            holdService.reconcileStuckHolds();
        } catch (Exception ex) {
            log.warn("Moderation recovery failed: {}", ex.getMessage());
        }
    }
}
