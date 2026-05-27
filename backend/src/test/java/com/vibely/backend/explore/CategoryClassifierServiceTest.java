package com.vibely.backend.explore;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.vibely.backend.explore.service.CategoryClassifierService;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CategoryClassifierServiceTest {

    @Mock
    private CategoryRepository categoryRepository;

    @InjectMocks
    private CategoryClassifierService classifierService;

    @Test
    void extractHashtagsNormalizesAndDeduplicates() {
        List<String> tags = classifierService.extractHashtags("Nhac #Music #MUSIC", "tap #dance cùng #music");
        assertThat(tags).containsExactly("music", "dance");
    }

    @Test
    void inferFallsBackToAllCategoryWhenNoSignal() {
        Category all = new Category();
        all.setSlug("all");
        all.setName("Tất cả");
        all.setEnabled(true);
        when(categoryRepository.findByEnabledTrueOrderByNameAsc()).thenReturn(List.of(all));
        when(categoryRepository.findBySlugAndEnabledTrue("all")).thenReturn(java.util.Optional.of(all));

        List<CategoryClassifierService.ScoredCategory> inferred = classifierService.inferCategories("hello world", "");

        assertThat(inferred).hasSize(1);
        assertThat(inferred.get(0).category().getSlug()).isEqualTo("all");
    }
}
