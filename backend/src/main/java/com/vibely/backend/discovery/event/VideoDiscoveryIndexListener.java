package com.vibely.backend.discovery.event;

import com.vibely.backend.discovery.config.DiscoveryProperties;
import com.vibely.backend.discovery.service.VideoDiscoveryIndexer;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class VideoDiscoveryIndexListener {

    private final DiscoveryProperties properties;
    private final VideoDiscoveryIndexer videoDiscoveryIndexer;
    private final VideoDiscoveryAsyncRunner asyncRunner;

    public VideoDiscoveryIndexListener(
        DiscoveryProperties properties,
        VideoDiscoveryIndexer videoDiscoveryIndexer,
        VideoDiscoveryAsyncRunner asyncRunner
    ) {
        this.properties = properties;
        this.videoDiscoveryIndexer = videoDiscoveryIndexer;
        this.asyncRunner = asyncRunner;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onVideoSaved(VideoDiscoveryIndexEvent event) {
        if (event == null || event.videoId() == null) {
            return;
        }
        if (properties.isAsyncIndexing()) {
            asyncRunner.run(event.videoId());
            return;
        }
        videoDiscoveryIndexer.runIndexing(event.videoId());
    }
}
