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
    void inferDoesNotMapCryOrMindGamesToEducationOrGaming() {
        Category education = category("education", "Giáo dục");
        Category gaming = category("gaming", "Gaming");
        Category music = category("music", "Music");
        when(categoryRepository.findByEnabledTrueOrderByNameAsc())
            .thenReturn(List.of(education, gaming, music));
        when(categoryRepository.findBySlugAndEnabledTrue("all")).thenReturn(java.util.Optional.empty());

        List<CategoryClassifierService.ScoredCategory> crying = classifierService.inferCategories(
            "Tiếng Khóc Của Cô Gái",
            "Bồ Câu kể chuyện"
        );
        assertThat(crying.stream().map(sc -> sc.category().getSlug())).doesNotContain("education");

        List<CategoryClassifierService.ScoredCategory> mindGames = classifierService.inferCategories(
            "Mind Games | lyric video",
            "#lyrics #song"
        );
        assertThat(mindGames.stream().map(sc -> sc.category().getSlug())).doesNotContain("gaming");
        assertThat(mindGames.get(0).category().getSlug()).isEqualTo("music");
    }

    @Test
    void extractHashtagsNormalizesAndDeduplicates() {
        List<String> tags = classifierService.extractHashtags("Nhac #Music #MUSIC", "tap #dance cùng #music");
        assertThat(tags).containsExactly("music", "dance");
    }

    @Test
    void inferMapsLyricsHashtagToMusicCategory() {
        Category all = category("all", "All");
        Category music = category("music", "Music");
        when(categoryRepository.findByEnabledTrueOrderByNameAsc()).thenReturn(List.of(all, music));

        List<CategoryClassifierService.ScoredCategory> inferred = classifierService.inferCategories(
            "bùa yêu",
            "#lyrics #gfx #fyp #xh"
        );

        assertThat(inferred).isNotEmpty();
        assertThat(inferred.get(0).category().getSlug()).isEqualTo("music");
    }

    @Test
    void inferFallsBackToAllCategoryWhenNoSignal() {
        Category all = category("all", "Tất cả");
        when(categoryRepository.findByEnabledTrueOrderByNameAsc()).thenReturn(List.of(all));
        when(categoryRepository.findBySlugAndEnabledTrue("all")).thenReturn(java.util.Optional.of(all));

        List<CategoryClassifierService.ScoredCategory> inferred = classifierService.inferCategories("hello world", "");

        assertThat(inferred).hasSize(1);
        assertThat(inferred.get(0).category().getSlug()).isEqualTo("all");
    }

    @Test
    void inferDoesNotMapGaiXinhNhayToTechnology() {
        Category dance = category("dance", "Nhảy");
        Category technology = category("technology", "Công nghệ");
        when(categoryRepository.findByEnabledTrueOrderByNameAsc()).thenReturn(List.of(dance, technology));

        List<CategoryClassifierService.ScoredCategory> inferred = classifierService.inferCategories(
            "Gái xinh nhảy",
            ""
        );

        assertThat(inferred).isNotEmpty();
        assertThat(inferred.get(0).category().getSlug()).isEqualTo("dance");
        assertThat(inferred.stream().map(sc -> sc.category().getSlug())).doesNotContain("technology");
    }

    @Test
    void selectCategoriesForPersistSkipsAllFallback() {
        Category all = category("all", "Tất cả");
        Category dance = category("dance", "Nhảy");
        List<CategoryClassifierService.ScoredCategory> persisted = classifierService.selectCategoriesForPersist(
            List.of(new CategoryClassifierService.ScoredCategory(all, 1.0))
        );
        assertThat(persisted).isEmpty();

        persisted = classifierService.selectCategoriesForPersist(
            List.of(
                new CategoryClassifierService.ScoredCategory(dance, 1.0),
                new CategoryClassifierService.ScoredCategory(all, 1.0)
            )
        );
        // Single keyword (=1.0) is too weak for Explore tabs; need hashtag or multi-hit (>=2.0).
        assertThat(persisted).isEmpty();

        persisted = classifierService.selectCategoriesForPersist(
            List.of(new CategoryClassifierService.ScoredCategory(dance, 2.0))
        );
        assertThat(persisted).hasSize(1);
        assertThat(persisted.get(0).category().getSlug()).isEqualTo("dance");
    }

    @Test
    void selectCategoriesForPersistKeepsStrongSecondaryCategories() {
        Category music = category("music", "Âm nhạc");
        Category dance = category("dance", "Nhảy");
        List<CategoryClassifierService.ScoredCategory> persisted = classifierService.selectCategoriesForPersist(
            List.of(
                new CategoryClassifierService.ScoredCategory(music, 2.0),
                new CategoryClassifierService.ScoredCategory(dance, 2.0)
            )
        );
        assertThat(persisted).hasSize(2);
    }

    private static Category category(String slug, String name) {
        Category category = new Category();
        category.setSlug(slug);
        category.setName(name);
        category.setEnabled(true);
        return category;
    }
}
