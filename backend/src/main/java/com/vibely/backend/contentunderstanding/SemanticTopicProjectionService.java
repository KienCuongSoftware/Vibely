package com.vibely.backend.contentunderstanding;

import com.vibely.backend.discovery.dto.ContentUnderstandingResult;
import com.vibely.backend.discovery.service.TopicGraphService;
import com.vibely.backend.video.Video;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Phase 3 topic engine — synthesize {@code video_topics} from semantic tags
 * (tag slug → canonical topic; optional mood/format template).
 */
@Service
public class SemanticTopicProjectionService {

    private static final float MIN_TAG_CONFIDENCE = 0.45f;
    private static final int MAX_TOPICS = 8;

    private final TopicGraphService topicGraphService;

    public SemanticTopicProjectionService(TopicGraphService topicGraphService) {
        this.topicGraphService = topicGraphService;
    }

    @Transactional
    public void projectTopicsFromTags(Video video, List<ScoredTag> tags) {
        if (video == null || tags == null || tags.isEmpty()) {
            return;
        }
        List<ScoredTag> ranked = tags.stream()
            .filter(t -> t != null && t.slug() != null && !t.slug().isBlank())
            .filter(t -> t.confidence() >= MIN_TAG_CONFIDENCE)
            .sorted(Comparator.comparingDouble(ScoredTag::confidence).reversed())
            .toList();
        if (ranked.isEmpty()) {
            return;
        }

        Map<String, Double> topicScores = new LinkedHashMap<>();
        for (ScoredTag tag : ranked) {
            String slug = normalizeSlug(tag.slug());
            topicScores.merge(slug, (double) tag.confidence(), Math::max);
            if (topicScores.size() >= MAX_TOPICS) {
                break;
            }
        }

        // Template topic from top visual-ish tag + optional mood (TDD §3.10)
        ScoredTag primary = ranked.get(0);
        ScoredTag mood = ranked.stream()
            .filter(t -> isMoodSlug(t.slug()))
            .findFirst()
            .orElse(null);
        if (mood != null && !normalizeSlug(primary.slug()).equals(normalizeSlug(mood.slug()))) {
            String compound = normalizeSlug(primary.slug()) + "_" + normalizeSlug(mood.slug());
            double compoundScore = Math.min(0.95, (primary.confidence() + mood.confidence()) / 2.0);
            topicScores.putIfAbsent(compound, compoundScore);
        }

        List<ContentUnderstandingResult.ScoredTopic> scored = new ArrayList<>();
        for (Map.Entry<String, Double> e : topicScores.entrySet()) {
            scored.add(new ContentUnderstandingResult.ScoredTopic(e.getKey(), e.getValue()));
        }
        topicGraphService.replaceVideoTopics(video, scored, "cu_tags");
    }

    private static boolean isMoodSlug(String slug) {
        String s = normalizeSlug(slug);
        return s.equals("sad")
            || s.equals("night")
            || s.equals("lofi")
            || s.equals("comedy")
            || s.equals("horror");
    }

    private static String normalizeSlug(String raw) {
        return raw.trim().toLowerCase(Locale.ROOT).replace('#', ' ').replace(' ', '_');
    }

    public record ScoredTag(String slug, float confidence) {
    }
}
