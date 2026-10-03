package com.vibely.backend.live.service;

import com.vibely.backend.live.config.LiveProperties;
import com.vibely.backend.live.repository.LiveRepository;
import java.time.LocalDateTime;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Ends LIVEs that exceeded {@code live.limits.max-duration-minutes} ({@code max_duration}). Runs on
 * every node; ending is idempotent (conditional transition), so concurrent nodes are harmless.
 */
@Component
public class LiveLimitsScheduler {

    private static final Logger log = LoggerFactory.getLogger(LiveLimitsScheduler.class);
    private static final int MAX_PER_TICK = 100;

    private final LiveRepository liveRepository;
    private final LiveService liveService;
    private final LiveProperties.Limits limits;

    public LiveLimitsScheduler(LiveRepository liveRepository, LiveService liveService, LiveProperties properties) {
        this.liveRepository = liveRepository;
        this.liveService = liveService;
        this.limits = properties.getLimits();
    }

    @Scheduled(
        initialDelayString = "${live.limits.check-interval-ms:60000}",
        fixedDelayString = "${live.limits.check-interval-ms:60000}"
    )
    public void enforceMaxDuration() {
        int maxMinutes = limits.getMaxDurationMinutes();
        if (maxMinutes <= 0) {
            return;
        }
        List<Long> overdue;
        try {
            overdue = liveRepository.findLiveIdsStartedBefore(LocalDateTime.now().minusMinutes(maxMinutes));
        } catch (RuntimeException ex) {
            log.warn("live.limits.query_failed error={}", ex.getClass().getSimpleName());
            return;
        }
        overdue.stream().limit(MAX_PER_TICK).forEach(liveId -> {
            try {
                liveService.endBySystem(liveId, LiveService.END_REASON_MAX_DURATION);
                log.info("live.limits.max_duration_ended liveId={} maxMinutes={}", liveId, maxMinutes);
            } catch (RuntimeException ex) {
                log.warn("live.limits.end_failed liveId={} error={}", liveId, ex.getClass().getSimpleName());
            }
        });
    }
}
