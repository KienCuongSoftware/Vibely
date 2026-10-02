package com.vibely.backend.live;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.vibely.backend.explore.Category;
import com.vibely.backend.explore.CategoryRepository;
import com.vibely.backend.explore.service.CategoryClassifierService;
import com.vibely.backend.live.entity.LiveCategory;
import com.vibely.backend.live.service.LiveCategoryClassifier;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class LiveCategoryClassifierTest {

    @Mock
    private CategoryRepository categoryRepository;

    private LiveCategoryClassifier classifier;

    @BeforeEach
    void setUp() {
        when(categoryRepository.findByEnabledTrueOrderByNameAsc()).thenReturn(List.of(
            category("music"), category("food"), category("travel"), category("gaming"),
            category("podcast"), category("lifestyle")
        ));
        when(categoryRepository.findBySlugAndEnabledTrue(any())).thenReturn(Optional.empty());
        classifier = new LiveCategoryClassifier(new CategoryClassifierService(categoryRepository));
    }

    @Test
    void recognisesSpecificGamesBeforeExploreCategories() {
        assertThat(classifier.classify("Bắn Free Fire leo rank", null)).isEqualTo(LiveCategory.FREEFIRE);
        assertThat(classifier.classify("Tối nay chơi gì", "#freefire")).isEqualTo(LiveCategory.FREEFIRE);
        assertThat(classifier.classify("PUBG Mobile cùng squad", null)).isEqualTo(LiveCategory.PUBG);
        assertThat(classifier.classify("Leo rank Liên Quân", null)).isEqualTo(LiveCategory.GAMING);
    }

    @Test
    void mapsExploreCategoriesToLiveCategories() {
        assertThat(classifier.classify("Hát karaoke theo yêu cầu", null)).isEqualTo(LiveCategory.MUSIC);
        assertThat(classifier.classify("Nấu ăn tối cùng mọi người", "#monan")).isEqualTo(LiveCategory.FOOD);
        assertThat(classifier.classify("Du lịch Đà Lạt", "#dulich")).isEqualTo(LiveCategory.OUTDOOR);
        assertThat(classifier.classify("Podcast đêm khuya", null)).isEqualTo(LiveCategory.CHAT);
    }

    @Test
    void fallsBackToLifestyle() {
        assertThat(classifier.classify("Phiên LIVE của Kiên", null)).isEqualTo(LiveCategory.LIFESTYLE);
        assertThat(classifier.classify("", "")).isEqualTo(LiveCategory.LIFESTYLE);
    }

    @Test
    void doesNotMatchKeywordsInsideOtherWords() {
        assertThat(classifier.classify("Coffee chill", null)).isEqualTo(LiveCategory.LIFESTYLE);
    }

    private static Category category(String slug) {
        Category category = new Category();
        category.setSlug(slug);
        category.setName(slug);
        category.setEnabled(true);
        return category;
    }
}
