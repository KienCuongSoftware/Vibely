package com.vibely.backend.discovery.service;

import com.vibely.backend.discovery.dto.ContentUnderstandingResult;
import com.vibely.backend.discovery.model.Topic;
import com.vibely.backend.discovery.model.VideoCategoryScore;
import com.vibely.backend.discovery.repository.VideoCategoryScoreRepository;
import com.vibely.backend.explore.Category;
import com.vibely.backend.explore.CategoryRepository;
import com.vibely.backend.video.Video;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CategoryTopicMapper {
    private static final Map<String, String> TOPIC_TO_CATEGORY = Map.ofEntries(
        Map.entry("music", "music"), Map.entry("edm", "music"), Map.entry("vpop", "music"), Map.entry("kpop", "music"),
        Map.entry("rock", "music"), Map.entry("karaoke", "music"), Map.entry("lyrics", "music"), Map.entry("remix", "music"),
        Map.entry("gaming", "gaming"), Map.entry("valorant", "gaming"), Map.entry("lol", "gaming"), Map.entry("dota2", "gaming"),
        Map.entry("cs2", "gaming"), Map.entry("esports", "gaming"),
        Map.entry("technology", "technology"), Map.entry("ai", "technology"), Map.entry("chatgpt", "technology"),
        Map.entry("cursor", "technology"), Map.entry("springboot", "technology"), Map.entry("coding", "technology"),
        Map.entry("food", "food"), Map.entry("recipe", "food"), Map.entry("street_food", "food"), Map.entry("vietnamese_food", "food"),
        Map.entry("fitness", "fitness"), Map.entry("gym", "fitness"), Map.entry("bodybuilding", "fitness"),
        Map.entry("anime", "anime"), Map.entry("manga", "anime"), Map.entry("cosplay", "anime"),
        Map.entry("dance", "dance"), Map.entry("travel", "travel"), Map.entry("beauty", "beauty"), Map.entry("comedy", "comedy"),
        Map.entry("fashion", "fashion"), Map.entry("sports", "sports"), Map.entry("pets", "pets"), Map.entry("news", "news"),
        Map.entry("vehicles", "automotive"), Map.entry("automotive", "automotive"), Map.entry("finance", "finance"), Map.entry("education", "education"),
        Map.entry("family", "family"), Map.entry("lifestyle", "lifestyle"), Map.entry("art", "art")
    );

    private final CategoryRepository categoryRepository;
    private final VideoCategoryScoreRepository videoCategoryScoreRepository;

    public CategoryTopicMapper(
        CategoryRepository categoryRepository,
        VideoCategoryScoreRepository videoCategoryScoreRepository
    ) {
        this.categoryRepository = categoryRepository;
        this.videoCategoryScoreRepository = videoCategoryScoreRepository;
    }

    @Transactional
    public void persistCategoryScores(Video video, ContentUnderstandingResult result) {
        videoCategoryScoreRepository.deleteByVideoId(video.getId());
        Map<String, Double> scores = new LinkedHashMap<>();
        for (ContentUnderstandingResult.ScoredCategorySlug cs : result.categoryScores()) {
            mergeScore(scores, cs.slug(), cs.score());
        }
        for (ContentUnderstandingResult.ScoredTopic topic : result.topics()) {
            String categorySlug = TOPIC_TO_CATEGORY.get(topic.name());
            if (categorySlug != null) {
                mergeScore(scores, categorySlug, topic.score() * 0.95);
            }
        }
        List<Category> enabled = categoryRepository.findByEnabledTrueOrderByNameAsc();
        Map<String, Category> bySlug = enabled.stream()
            .collect(java.util.stream.Collectors.toMap(Category::getSlug, c -> c, (a, b) -> a));
        for (Map.Entry<String, Double> entry : scores.entrySet()) {
            Category category = bySlug.get(entry.getKey());
            if (category == null || "all".equals(category.getSlug())) {
                continue;
            }
            videoCategoryScoreRepository.save(new VideoCategoryScore(video, category, entry.getValue(), result.source()));
        }
    }

    public String mapTopicToCategory(String topicSlug) {
        return TOPIC_TO_CATEGORY.get(normalize(topicSlug));
    }

    private static void mergeScore(Map<String, Double> scores, String slug, double score) {
        String key = normalize(slug);
        if (key.isBlank()) {
            return;
        }
        scores.merge(key, Math.max(0, Math.min(1, score)), Math::max);
    }

    private static String normalize(String raw) {
        return raw == null ? "" : raw.trim().toLowerCase(Locale.ROOT);
    }
}
