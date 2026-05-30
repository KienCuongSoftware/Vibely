package com.vibely.backend.discovery.event;

import com.vibely.backend.discovery.service.VideoDiscoveryIndexer;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Component
public class VideoDiscoveryAsyncRunner {

    private final VideoDiscoveryIndexer videoDiscoveryIndexer;

    public VideoDiscoveryAsyncRunner(VideoDiscoveryIndexer videoDiscoveryIndexer) {
        this.videoDiscoveryIndexer = videoDiscoveryIndexer;
    }

    @Async
    public void run(Long videoId) {
        videoDiscoveryIndexer.runIndexing(videoId);
    }
}
