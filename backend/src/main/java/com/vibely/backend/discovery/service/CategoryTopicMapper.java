package com.vibely.backend.discovery.service;

import com.vibely.backend.discovery.dto.ContentUnderstandingResult;
import com.vibely.backend.discovery.model.VideoCategoryScore;
import com.vibely.backend.discovery.repository.TopicCategoryMappingRepository;
import com.vibely.backend.discovery.repository.VideoCategoryScoreRepository;
import com.vibely.backend.explore.Category;
import com.vibely.backend.explore.CategoryRepository;
import com.vibely.backend.video.Video;
import jakarta.annotation.PostConstruct;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CategoryTopicMapper {
    private final CategoryRepository categoryRepository;
    private final VideoCategoryScoreRepository videoCategoryScoreRepository;
    private final TopicCategoryMappingRepository topicCategoryMappingRepository;
    private volatile Map<String, String> topicToCategory = Map.of();
    private volatile Map<String, Double> topicCategoryWeights = Map.of();

    public CategoryTopicMapper(
        CategoryRepository categoryRepository,
        VideoCategoryScoreRepository videoCategoryScoreRepository,
        TopicCategoryMappingRepository topicCategoryMappingRepository
    ) {
        this.categoryRepository = categoryRepository;
        this.videoCategoryScoreRepository = videoCategoryScoreRepository;
        this.topicCategoryMappingRepository = topicCategoryMappingRepository;
    }

    @PostConstruct
    void loadMappings() {
        refreshMappings();
    }

    public void refreshMappings() {
        Map<String, String> nextTopicToCategory = new ConcurrentHashMap<>();
        Map<String, Double> nextWeights = new ConcurrentHashMap<>();
        for (Object[] row : topicCategoryMappingRepository.findTopicCategoryWeights()) {
            String topicSlug = normalize(String.valueOf(row[0]));
            String categorySlug = normalize(String.valueOf(row[1]));
            double weight = row[2] == null ? 1.0 : ((Number) row[2]).doubleValue();
            if (topicSlug.isBlank() || categorySlug.isBlank()) {
                continue;
            }
            nextTopicToCategory.putIfAbsent(topicSlug, categorySlug);
            nextWeights.put(topicSlug + "->" + categorySlug, weight);
        }
        topicToCategory = Map.copyOf(nextTopicToCategory);
        topicCategoryWeights = Map.copyOf(nextWeights);
    }

    @Transactional
    public void persistCategoryScores(Video video, ContentUnderstandingResult result) {
        videoCategoryScoreRepository.deleteByVideoId(video.getId());
        Map<String, Double> scores = new LinkedHashMap<>();
        for (ContentUnderstandingResult.ScoredCategorySlug cs : result.categoryScores()) {
            mergeScore(scores, cs.slug(), cs.score());
        }
        for (ContentUnderstandingResult.ScoredTopic topic : result.topics()) {
            String categorySlug = mapTopicToCategory(topic.name());
            if (categorySlug != null) {
                double weight = topicCategoryWeights.getOrDefault(
                    normalize(topic.name()) + "->" + categorySlug,
                    1.0
                );
                mergeScore(scores, categorySlug, topic.score() * weight * 0.95);
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
        return topicToCategory.get(normalize(topicSlug));
    }

    private static void mergeScore(Map<String, Double> scores, String slug, double score) {
        String key = normalize(slug);
        if (key.isBlank()) {
            return;
        }
        double clamped = Math.max(0, Math.min(1, score));
        scores.put(key, Math.max(scores.getOrDefault(key, 0.0), clamped));
    }

    private static String normalize(String raw) {
        return raw == null ? "" : raw.trim().toLowerCase(Locale.ROOT);
    }
}
