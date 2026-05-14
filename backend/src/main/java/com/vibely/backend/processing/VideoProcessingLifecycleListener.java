package com.vibely.backend.processing;

import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class VideoProcessingLifecycleListener {

    private final ProcessingProperties processingProperties;
    private final VideoProcessingDryRunService dryRunService;

    public VideoProcessingLifecycleListener(
        ProcessingProperties processingProperties,
        VideoProcessingDryRunService dryRunService
    ) {
        this.processingProperties = processingProperties;
        this.dryRunService = dryRunService;
    }

    /**
     * Runs after the upload transaction commits so the HTTP thread never blocks on FFmpeg and DB stays consistent.
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onVideoQueued(VideoQueuedAfterPersistEvent event) {
        if (processingProperties.getWorker().isEnabled()) {
            return;
        }
        if (!processingProperties.isDryRunPromoteWhenWorkerDisabled()) {
            return;
        }
        dryRunService.promoteWithoutTranscode(event.getVideoId());
    }
}
