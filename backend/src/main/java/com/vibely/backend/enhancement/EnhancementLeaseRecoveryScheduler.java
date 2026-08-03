package com.vibely.backend.enhancement;

import java.time.Instant;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@ConditionalOnProperty(prefix = "app.enhancement", name = "enabled", havingValue = "true", matchIfMissing = true)
public class EnhancementLeaseRecoveryScheduler {

    private static final Logger log = LoggerFactory.getLogger(EnhancementLeaseRecoveryScheduler.class);

    private final EnhancementProperties properties;
    private final EnhancementJobRepository jobRepository;

    public EnhancementLeaseRecoveryScheduler(
        EnhancementProperties properties,
        EnhancementJobRepository jobRepository
    ) {
        this.properties = properties;
        this.jobRepository = jobRepository;
    }

    @Scheduled(
        fixedDelayString = "${app.enhancement.lease-recovery-interval-ms:60000}",
        initialDelayString = "30000"
    )
    @Transactional
    public void recoverExpiredLeases() {
        if (!properties.isLeaseRecoveryEnabled()) {
            return;
        }
        List<EnhancementJobEntity> expired = jobRepository.findExpiredLeases(Instant.now());
        if (expired.isEmpty()) {
            return;
        }
        Instant now = Instant.now();
        for (EnhancementJobEntity job : expired) {
            job.setLeaseOwner(null);
            job.setLeaseUntil(null);
            if (job.getAttempts() < job.getMaxAttempts()) {
                job.setState(EnhancementJobState.QUEUED);
                job.setQueuedAt(now);
                job.setProgressStage("LEASE_EXPIRED_REQUEUE");
                job.setLastError("Lease expired; requeued for another worker");
                log.warn("Requeued expired lease jobId={} attempts={}", job.getId(), job.getAttempts());
            } else {
                job.setState(EnhancementJobState.DEAD);
                job.setFinishedAt(now);
                job.setProgressStage("LEASE_EXPIRED_DEAD");
                job.setLastError("Lease expired and max attempts reached");
                log.warn("Dead after lease expiry jobId={}", job.getId());
            }
            jobRepository.save(job);
        }
    }
}
