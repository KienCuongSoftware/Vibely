package com.vibely.backend.discovery.service;

import com.vibely.backend.discovery.dto.ContentUnderstandingResult;
import com.vibely.backend.explore.Category;
import com.vibely.backend.explore.CategoryRepository;
import com.vibely.backend.explore.VideoCategory;
import com.vibely.backend.explore.VideoCategoryRepository;
import com.vibely.backend.explore.service.CategoryClassifierService;
import com.vibely.backend.video.Video;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ExploreLegacyCategorySyncService {
    private static final double MIN_AI_CATEGORY_SCORE = 0.35;

    private final CategoryRepository categoryRepository;
    private final VideoCategoryRepository videoCategoryRepository;
    private final CategoryClassifierService categoryClassifierService;

    public ExploreLegacyCategorySyncService(
        CategoryRepository categoryRepository,
        VideoCategoryRepository videoCategoryRepository,
        CategoryClassifierService categoryClassifierService
    ) {
        this.categoryRepository = categoryRepository;
        this.videoCategoryRepository = videoCategoryRepository;
        this.categoryClassifierService = categoryClassifierService;
    }

    @Transactional
    public void syncFromAiResult(Video video, ContentUnderstandingResult result) {
        if (video == null || result == null || result.categoryScores().isEmpty()) {
            return;
        }
        if (!"OPENAI".equalsIgnoreCase(result.source())) {
            return;
        }
        Map<String, Category> bySlug = categoryRepository.findByEnabledTrueOrderByNameAsc().stream()
            .collect(Collectors.toMap(Category::getSlug, c -> c, (a, b) -> a));

        List<CategoryClassifierService.ScoredCategory> mapped = new ArrayList<>();
        for (ContentUnderstandingResult.ScoredCategorySlug scored : result.categoryScores()) {
            if (scored.score() < MIN_AI_CATEGORY_SCORE) {
                continue;
            }
            Category category = bySlug.get(scored.slug());
            if (category == null || CategoryClassifierService.ALL_CATEGORY_SLUG.equals(category.getSlug())) {
                continue;
            }
            mapped.add(new CategoryClassifierService.ScoredCategory(category, scored.score() * 3.0));
        }
        mapped = mapped.stream()
            .sorted((a, b) -> Double.compare(b.score(), a.score()))
            .toList();
        List<CategoryClassifierService.ScoredCategory> selected =
            categoryClassifierService.selectCategoriesForPersist(mapped);
        if (selected.isEmpty()) {
            return;
        }

        videoCategoryRepository.deleteByVideoId(video.getId());
        for (CategoryClassifierService.ScoredCategory scored : selected) {
            videoCategoryRepository.save(new VideoCategory(video, scored.category(), scored.score()));
        }
    }
}
