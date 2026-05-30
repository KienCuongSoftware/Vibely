package com.vibely.backend.discovery.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vibely.backend.discovery.config.DiscoveryProperties;
import com.vibely.backend.discovery.dto.ContentUnderstandingResult;
import com.vibely.backend.discovery.model.VideoContentUnderstanding;
import com.vibely.backend.discovery.repository.VideoContentUnderstandingRepository;
import com.vibely.backend.explore.service.CategoryClassifierService;
import com.vibely.backend.video.Video;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ContentUnderstandingOrchestrator {
    private static final Logger log = LoggerFactory.getLogger(ContentUnderstandingOrchestrator.class);

    private final DiscoveryProperties properties;
    private final OpenAiContentUnderstandingService openAiContentUnderstandingService;
    private final CategoryClassifierService categoryClassifierService;
    private final TopicGraphService topicGraphService;
    private final CategoryTopicMapper categoryTopicMapper;
    private final VideoContentUnderstandingRepository understandingRepository;
    private final ObjectMapper objectMapper;

    public ContentUnderstandingOrchestrator(
        DiscoveryProperties properties,
        OpenAiContentUnderstandingService openAiContentUnderstandingService,
        CategoryClassifierService categoryClassifierService,
        TopicGraphService topicGraphService,
        CategoryTopicMapper categoryTopicMapper,
        VideoContentUnderstandingRepository understandingRepository,
        ObjectMapper objectMapper
    ) {
        this.properties = properties;
        this.openAiContentUnderstandingService = openAiContentUnderstandingService;
        this.categoryClassifierService = categoryClassifierService;
        this.topicGraphService = topicGraphService;
        this.categoryTopicMapper = categoryTopicMapper;
        this.understandingRepository = understandingRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public ContentUnderstandingResult analyzeAndPersist(Video video) {
        List<String> hashtags = categoryClassifierService.extractHashtags(video.getTitle(), video.getDescription());
        ContentUnderstandingResult result = analyzeWithFailover(video, hashtags);
        persistUnderstanding(video, result);
        topicGraphService.replaceVideoTopics(video, result.topics(), result.source());
        categoryTopicMapper.persistCategoryScores(video, result);
        return result;
    }

    private ContentUnderstandingResult analyzeWithFailover(Video video, List<String> hashtags) {
        if (properties.hasOpenAiCredentials()) {
            try {
                return openAiContentUnderstandingService.analyze(
                    video.getTitle(),
                    video.getDescription(),
                    hashtags,
                    null,
                    null,
                    video.getAudioTitle()
                );
            } catch (Exception ex) {
                log.warn("Falling back to legacy classifier for video {}: {}", video.getId(), ex.getMessage());
            }
        }
        return openAiContentUnderstandingService.fromLegacyClassifier(
            categoryClassifierService,
            video.getTitle(),
            video.getDescription()
        );
    }

    private void persistUnderstanding(Video video, ContentUnderstandingResult result) {
        VideoContentUnderstanding row = understandingRepository.findByVideoId(video.getId())
            .orElseGet(VideoContentUnderstanding::new);
        applyUnderstanding(row, video, result);
        try {
            understandingRepository.saveAndFlush(row);
        } catch (DataIntegrityViolationException ex) {
            VideoContentUnderstanding existing = understandingRepository.findByVideoId(video.getId())
                .orElseThrow(() -> ex);
            applyUnderstanding(existing, video, result);
            understandingRepository.save(existing);
        }
    }

    private void applyUnderstanding(
        VideoContentUnderstanding row,
        Video video,
        ContentUnderstandingResult result
    ) {
        row.setVideo(video);
        row.setModel(properties.hasOpenAiCredentials() ? properties.getUnderstandingModel() : "legacy-classifier");
        try {
            row.setPayloadJson(objectMapper.writeValueAsString(result));
        } catch (Exception ex) {
            row.setPayloadJson(result.rawJson());
        }
        row.setConfidence(result.confidence());
        row.setSource(result.source());
    }
}
