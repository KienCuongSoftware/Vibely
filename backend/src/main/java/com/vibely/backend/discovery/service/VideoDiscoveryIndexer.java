package com.vibely.backend.discovery.service;

import com.vibely.backend.discovery.config.DiscoveryProperties;
import com.vibely.backend.discovery.event.VideoDiscoveryIndexEvent;
import com.vibely.backend.explore.service.CategoryClassifierService;
import com.vibely.backend.explore.service.ExploreCacheService;
import com.vibely.backend.video.Video;
import com.vibely.backend.video.VideoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class VideoDiscoveryIndexer {
    private static final Logger log = LoggerFactory.getLogger(VideoDiscoveryIndexer.class);

    private final DiscoveryProperties properties;
    private final ApplicationEventPublisher eventPublisher;
    private final VideoRepository videoRepository;
    private final ContentUnderstandingOrchestrator contentUnderstandingOrchestrator;
    private final OpenAiEmbeddingService openAiEmbeddingService;
    private final VideoEngagementStatsService videoEngagementStatsService;
    private final CategoryClassifierService categoryClassifierService;
    private final ExploreCacheService exploreCacheService;

    public VideoDiscoveryIndexer(
        DiscoveryProperties properties,
        ApplicationEventPublisher eventPublisher,
        VideoRepository videoRepository,
        ContentUnderstandingOrchestrator contentUnderstandingOrchestrator,
        OpenAiEmbeddingService openAiEmbeddingService,
        VideoEngagementStatsService videoEngagementStatsService,
        CategoryClassifierService categoryClassifierService,
        ExploreCacheService exploreCacheService
    ) {
        this.properties = properties;
        this.eventPublisher = eventPublisher;
        this.videoRepository = videoRepository;
        this.contentUnderstandingOrchestrator = contentUnderstandingOrchestrator;
        this.openAiEmbeddingService = openAiEmbeddingService;
        this.videoEngagementStatsService = videoEngagementStatsService;
        this.categoryClassifierService = categoryClassifierService;
        this.exploreCacheService = exploreCacheService;
    }

    public void indexAfterLegacySync(Long videoId) {
        if (!properties.isEnabled() || videoId == null) {
            return;
        }
        eventPublisher.publishEvent(new VideoDiscoveryIndexEvent(videoId));
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void runIndexing(Long videoId) {
        Video video = videoRepository.findById(videoId).orElse(null);
        if (video == null) {
            return;
        }
        try {
            var result = contentUnderstandingOrchestrator.analyzeAndPersist(video);
            openAiEmbeddingService.indexVideoEmbedding(
                video,
                categoryClassifierService.extractHashtags(video.getTitle(), video.getDescription())
            );
            videoEngagementStatsService.recomputeSafely(video);
            exploreCacheService.evictByPrefix("trending");
            exploreCacheService.evictByPrefix("category:");
            exploreCacheService.evictByPrefix("related:" + video.getPublicId());
            log.debug("Discovery indexed video {} source={}", videoId, result.source());
        } catch (Exception ex) {
            log.warn("Discovery indexing failed for video {}: {}", videoId, ex.getMessage());
        }
    }
}
