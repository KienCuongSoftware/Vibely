package com.vibely.backend.discovery;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.vibely.backend.discovery.config.DiscoveryProperties;
import com.vibely.backend.discovery.service.OpenAiContentUnderstandingService;
import com.vibely.backend.explore.Category;
import com.vibely.backend.explore.CategoryRepository;
import com.vibely.backend.explore.service.CategoryClassifierService;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import com.fasterxml.jackson.databind.ObjectMapper;

@ExtendWith(MockitoExtension.class)
class OpenAiContentUnderstandingServiceTest {

    @Mock
    private CategoryRepository categoryRepository;

    @Test
    void legacyFallbackMapsLyricsToMusicTopic() {
        DiscoveryProperties properties = new DiscoveryProperties();
        properties.setHashtagWeightCap(0.25);
        OpenAiContentUnderstandingService service = new OpenAiContentUnderstandingService(
            properties,
            null,
            new ObjectMapper()
        );
        CategoryClassifierService classifier = new CategoryClassifierService(categoryRepository);
        Category all = category("all", "All");
        Category music = category("music", "Music");
        when(categoryRepository.findByEnabledTrueOrderByNameAsc()).thenReturn(List.of(all, music));

        var result = service.fromLegacyClassifier(classifier, "bùa yêu", "#lyrics #fyp");

        assertThat(result.source()).isEqualTo("LEGACY");
        assertThat(result.topics()).anyMatch(t -> "music".equals(t.name()) || "lyrics".equals(t.name()));
        assertThat(result.categoryScores()).isNotEmpty();
        assertThat(result.categoryScores().get(0).slug()).isEqualTo("music");
    }

    @Test
    void normalizeTopicSlug() {
        assertThat(OpenAiContentUnderstandingService.normalizeTopic("EDM Remix")).isEqualTo("edm_remix");
    }

    private static Category category(String slug, String name) {
        Category category = new Category();
        category.setSlug(slug);
        category.setName(name);
        category.setEnabled(true);
        return category;
    }
}
