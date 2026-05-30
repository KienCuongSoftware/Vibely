package com.vibely.backend.discovery.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vibely.backend.discovery.config.DiscoveryProperties;
import com.vibely.backend.discovery.dto.ContentUnderstandingResult;
import com.vibely.backend.discovery.openai.OpenAiHttpClient;
import com.vibely.backend.explore.service.CategoryClassifierService;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class OpenAiContentUnderstandingService {
    private static final Logger log = LoggerFactory.getLogger(OpenAiContentUnderstandingService.class);

    private static final String SYSTEM_PROMPT = """
        You are a short-form video content understanding engine for TikTok-style platforms.
        Analyze title, description, and hashtags. Hashtags are weak signals — weight title and description higher.
        Return JSON only with keys:
        topics (array of {name, score}),
        semantic_tags (array of strings),
        category_scores (array of {slug, score}) using slugs:
        music, food, anime, technology, travel, gaming, family, education, comedy, beauty, lifestyle, art,
        dance, finance, fitness, sports, fashion, pets, news, automotive, all.
        confidence (0-1 number).
        Topic names must be lowercase snake_case. Scores are 0-1.
        """;

    private final DiscoveryProperties properties;
    private final OpenAiHttpClient openAiHttpClient;
    private final ObjectMapper objectMapper;

    public OpenAiContentUnderstandingService(
        DiscoveryProperties properties,
        OpenAiHttpClient openAiHttpClient,
        ObjectMapper objectMapper
    ) {
        this.properties = properties;
        this.openAiHttpClient = openAiHttpClient;
        this.objectMapper = objectMapper;
    }

    public ContentUnderstandingResult analyze(
        String title,
        String description,
        List<String> hashtags,
        String transcript,
        String ocrText,
        String audioMetadata
    ) {
        if (!properties.hasOpenAiCredentials()) {
            throw new IllegalStateException("OpenAI not configured");
        }
        try {
            String userPrompt = buildUserPrompt(title, description, hashtags, transcript, ocrText, audioMetadata);
            String json = openAiHttpClient.createStructuredUnderstanding(SYSTEM_PROMPT, userPrompt);
            return parseJson(json, "OPENAI");
        } catch (Exception ex) {
            log.warn("OpenAI content understanding failed: {}", ex.getMessage());
            throw new IllegalStateException("OpenAI content understanding failed", ex);
        }
    }

    public ContentUnderstandingResult fromLegacyClassifier(
        CategoryClassifierService classifierService,
        String title,
        String description
    ) {
        List<String> hashtags = classifierService.extractHashtags(title, description);
        List<CategoryClassifierService.ScoredCategory> categories = classifierService.inferCategories(title, description);
        Map<String, Double> topicScores = new LinkedHashMap<>();
        for (String tag : hashtags) {
            topicScores.merge(normalizeTopic(tag), properties.getHashtagWeightCap(), Math::max);
        }
        for (CategoryClassifierService.ScoredCategory scored : categories) {
            String slug = scored.category().getSlug();
            double normalized = Math.min(1.0, scored.score() / 6.0);
            topicScores.merge(normalizeTopic(slug), normalized, Math::max);
        }
        List<ContentUnderstandingResult.ScoredTopic> topics = topicScores.entrySet().stream()
            .map(e -> new ContentUnderstandingResult.ScoredTopic(e.getKey(), e.getValue()))
            .toList();
        List<ContentUnderstandingResult.ScoredCategorySlug> categoryScores = categories.stream()
            .map(c -> new ContentUnderstandingResult.ScoredCategorySlug(
                c.category().getSlug(),
                Math.min(1.0, c.score() / 6.0)
            ))
            .toList();
        String rawJson = "{\"source\":\"LEGACY\"}";
        return new ContentUnderstandingResult(topics, List.of(), categoryScores, 0.55, rawJson, "LEGACY");
    }

    private ContentUnderstandingResult parseJson(String json, String source) throws Exception {
        JsonNode root = objectMapper.readTree(json);
        List<ContentUnderstandingResult.ScoredTopic> topics = new ArrayList<>();
        for (JsonNode node : root.path("topics")) {
            String name = normalizeTopic(node.path("name").asText(""));
            if (name.isBlank()) {
                continue;
            }
            topics.add(new ContentUnderstandingResult.ScoredTopic(name, node.path("score").asDouble(0.5)));
        }
        List<String> semanticTags = new ArrayList<>();
        for (JsonNode node : root.path("semantic_tags")) {
            String tag = node.asText("").trim();
            if (!tag.isBlank()) {
                semanticTags.add(tag);
            }
        }
        List<ContentUnderstandingResult.ScoredCategorySlug> categoryScores = new ArrayList<>();
        for (JsonNode node : root.path("category_scores")) {
            String slug = node.path("slug").asText("").trim().toLowerCase(Locale.ROOT);
            if (!slug.isBlank()) {
                categoryScores.add(new ContentUnderstandingResult.ScoredCategorySlug(slug, node.path("score").asDouble(0.5)));
            }
        }
        double confidence = root.path("confidence").asDouble(0.7);
        return new ContentUnderstandingResult(topics, semanticTags, categoryScores, confidence, json, source);
    }

    private static String buildUserPrompt(
        String title,
        String description,
        List<String> hashtags,
        String transcript,
        String ocrText,
        String audioMetadata
    ) {
        StringBuilder sb = new StringBuilder();
        sb.append("title: ").append(nullSafe(title)).append('\n');
        sb.append("description: ").append(nullSafe(description)).append('\n');
        sb.append("hashtags: ").append(hashtags == null ? "[]" : hashtags).append('\n');
        if (transcript != null && !transcript.isBlank()) {
            sb.append("transcript: ").append(transcript).append('\n');
        }
        if (ocrText != null && !ocrText.isBlank()) {
            sb.append("ocr_text: ").append(ocrText).append('\n');
        }
        if (audioMetadata != null && !audioMetadata.isBlank()) {
            sb.append("audio_metadata: ").append(audioMetadata).append('\n');
        }
        return sb.toString();
    }

    private static String nullSafe(String value) {
        return value == null ? "" : value;
    }

    public static String normalizeTopic(String raw) {
        if (raw == null) {
            return "";
        }
        return raw.trim().toLowerCase(Locale.ROOT)
            .replaceAll("[^a-z0-9_\\p{L}]+", "_")
            .replaceAll("_+", "_")
            .replaceAll("^_|_$", "");
    }
}
