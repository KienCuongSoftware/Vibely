package com.vibely.backend.enhancement;

import com.vibely.backend.video.VideoRepository;
import com.vibely.backend.video.VideoStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class VideoBecameReadyEnhancementListener {

    private static final Logger log = LoggerFactory.getLogger(VideoBecameReadyEnhancementListener.class);

    private final EnhancementProperties properties;
    private final EnhancementEnqueueService enqueueService;
    private final EnhancementJobService jobService;
    private final VideoRepository videoRepository;

    public VideoBecameReadyEnhancementListener(
        EnhancementProperties properties,
        EnhancementEnqueueService enqueueService,
        EnhancementJobService jobService,
        VideoRepository videoRepository
    ) {
        this.properties = properties;
        this.enqueueService = enqueueService;
        this.jobService = jobService;
        this.videoRepository = videoRepository;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onReady(VideoBecameReadyEvent event) {
        if (!properties.isEnabled()) {
            return;
        }
        videoRepository.findById(event.videoId()).ifPresent(video -> {
            if (video.getStatus() != VideoStatus.READY) {
                return;
            }
            try {
                jobService.ensureStandardVersionPublic(video);
            } catch (Exception ex) {
                log.warn("ensure STANDARD version failed videoId={}: {}", event.videoId(), ex.getMessage());
            }
            if (!properties.isEnqueueOnReady()) {
                return;
            }
            try {
                enqueueService.enqueueManual(
                    video.getId(),
                    "ENHANCE_NATIVE",
                    properties.getDefaultLevel(),
                    "ON_READY"
                );
                log.info("Auto-enqueued enhancement ON_READY videoId={}", video.getId());
            } catch (Exception ex) {
                log.warn("Auto-enqueue ON_READY skipped videoId={}: {}", video.getId(), ex.getMessage());
            }
        });
    }
}
