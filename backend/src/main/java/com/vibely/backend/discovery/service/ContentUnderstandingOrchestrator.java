package com.vibely.backend.discovery.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vibely.backend.discovery.config.DiscoveryProperties;
import com.vibely.backend.discovery.dto.ContentUnderstandingResult;
import com.vibely.backend.discovery.dto.VideoMediaSignals;
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
    private final VideoMediaUnderstandingService videoMediaUnderstandingService;
    private final ExploreLegacyCategorySyncService exploreLegacyCategorySyncService;
    private final ObjectMapper objectMapper;

    public ContentUnderstandingOrchestrator(
        DiscoveryProperties properties,
        OpenAiContentUnderstandingService openAiContentUnderstandingService,
        CategoryClassifierService categoryClassifierService,
        TopicGraphService topicGraphService,
        CategoryTopicMapper categoryTopicMapper,
        VideoContentUnderstandingRepository understandingRepository,
        VideoMediaUnderstandingService videoMediaUnderstandingService,
        ExploreLegacyCategorySyncService exploreLegacyCategorySyncService,
        ObjectMapper objectMapper
    ) {
        this.properties = properties;
        this.openAiContentUnderstandingService = openAiContentUnderstandingService;
        this.categoryClassifierService = categoryClassifierService;
        this.topicGraphService = topicGraphService;
        this.categoryTopicMapper = categoryTopicMapper;
        this.understandingRepository = understandingRepository;
        this.videoMediaUnderstandingService = videoMediaUnderstandingService;
        this.exploreLegacyCategorySyncService = exploreLegacyCategorySyncService;
        this.objectMapper = objectMapper;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public ContentUnderstandingResult analyzeAndPersist(Video video) {
        List<String> hashtags = categoryClassifierService.extractHashtags(video.getTitle(), video.getDescription());
        VideoMediaSignals mediaSignals = resolveMediaSignals(video);
        ContentUnderstandingResult result = analyzeWithFailover(video, hashtags, mediaSignals);
        persistUnderstanding(video, result, mediaSignals);
        topicGraphService.replaceVideoTopics(video, result.topics(), result.source());
        categoryTopicMapper.persistCategoryScores(video, result);
        exploreLegacyCategorySyncService.syncFromAiResult(video, result);
        return result;
    }

    private VideoMediaSignals resolveMediaSignals(Video video) {
        VideoContentUnderstanding cached = understandingRepository.findByVideoId(video.getId()).orElse(null);
        if (cached != null && (hasText(cached.getTranscriptText()) || hasText(cached.getOcrText()))) {
            return new VideoMediaSignals(
                cached.getTranscriptText() == null ? "" : cached.getTranscriptText(),
                cached.getOcrText() == null ? "" : cached.getOcrText()
            );
        }
        VideoMediaSignals extracted = videoMediaUnderstandingService.extractSignals(video);
        if (extracted.hasContent()) {
            log.debug(
                "Media signals extracted for video {} transcriptChars={} ocrChars={}",
                video.getId(),
                length(extracted.transcript()),
                length(extracted.ocrText())
            );
        }
        return extracted;
    }

    private ContentUnderstandingResult analyzeWithFailover(
        Video video,
        List<String> hashtags,
        VideoMediaSignals mediaSignals
    ) {
        String enrichedDescription = enrichDescription(video.getDescription(), mediaSignals);
        if (properties.hasOpenAiCredentials()) {
            try {
                return openAiContentUnderstandingService.analyze(
                    video.getTitle(),
                    enrichedDescription,
                    hashtags,
                    mediaSignals.transcript(),
                    mediaSignals.ocrText(),
                    video.getAudioTitle()
                );
            } catch (Exception ex) {
                log.warn("Falling back to legacy classifier for video {}: {}", video.getId(), ex.getMessage());
            }
        }
        return openAiContentUnderstandingService.fromLegacyClassifier(
            categoryClassifierService,
            video.getTitle(),
            enrichedDescription
        );
    }

    private void persistUnderstanding(
        Video video,
        ContentUnderstandingResult result,
        VideoMediaSignals mediaSignals
    ) {
        VideoContentUnderstanding row = understandingRepository.findByVideoId(video.getId())
            .orElseGet(VideoContentUnderstanding::new);
        applyUnderstanding(row, video, result, mediaSignals);
        try {
            understandingRepository.saveAndFlush(row);
        } catch (DataIntegrityViolationException ex) {
            VideoContentUnderstanding existing = understandingRepository.findByVideoId(video.getId())
                .orElseThrow(() -> ex);
            applyUnderstanding(existing, video, result, mediaSignals);
            understandingRepository.save(existing);
        }
    }

    private void applyUnderstanding(
        VideoContentUnderstanding row,
        Video video,
        ContentUnderstandingResult result,
        VideoMediaSignals mediaSignals
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
        if (mediaSignals != null) {
            if (hasText(mediaSignals.transcript())) {
                row.setTranscriptText(mediaSignals.transcript());
            }
            if (hasText(mediaSignals.ocrText())) {
                row.setOcrText(mediaSignals.ocrText());
            }
        }
    }

    static String enrichDescription(String description, VideoMediaSignals mediaSignals) {
        StringBuilder sb = new StringBuilder(description == null ? "" : description.trim());
        if (mediaSignals == null) {
            return sb.toString();
        }
        if (hasText(mediaSignals.transcript())) {
            if (!sb.isEmpty()) {
                sb.append('\n');
            }
            sb.append("[transcript] ").append(mediaSignals.transcript().trim());
        }
        if (hasText(mediaSignals.ocrText())) {
            if (!sb.isEmpty()) {
                sb.append('\n');
            }
            sb.append("[on-screen] ").append(mediaSignals.ocrText().trim());
        }
        return sb.toString();
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private static int length(String value) {
        return value == null ? 0 : value.length();
    }
}
