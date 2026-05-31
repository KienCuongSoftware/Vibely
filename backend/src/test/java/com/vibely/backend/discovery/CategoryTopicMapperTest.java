package com.vibely.backend.discovery;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.vibely.backend.discovery.repository.TopicCategoryMappingRepository;
import com.vibely.backend.discovery.service.CategoryTopicMapper;
import com.vibely.backend.explore.CategoryRepository;
import com.vibely.backend.discovery.repository.VideoCategoryScoreRepository;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CategoryTopicMapperTest {
    @Mock
    private CategoryRepository categoryRepository;
    @Mock
    private VideoCategoryScoreRepository videoCategoryScoreRepository;
    @Mock
    private TopicCategoryMappingRepository topicCategoryMappingRepository;

    private CategoryTopicMapper mapper;

    @BeforeEach
    void setUp() {
        mapper = new CategoryTopicMapper(categoryRepository, videoCategoryScoreRepository, topicCategoryMappingRepository);
        when(topicCategoryMappingRepository.findTopicCategoryWeights()).thenReturn(List.of(
            new Object[] { "edm", "music", 1.0 },
            new Object[] { "valorant", "gaming", 1.0 }
        ));
        mapper.refreshMappings();
    }

    @Test
    void mapsEdmTopicToMusicCategory() {
        assertThat(mapper.mapTopicToCategory("edm")).isEqualTo("music");
    }

    @Test
    void mapsValorantTopicToGamingCategory() {
        assertThat(mapper.mapTopicToCategory("valorant")).isEqualTo("gaming");
    }
}
