package com.vibely.backend.discovery;

import static org.assertj.core.api.Assertions.assertThat;

import com.vibely.backend.discovery.service.CategoryTopicMapper;
import org.junit.jupiter.api.Test;

class CategoryTopicMapperTest {
    private final CategoryTopicMapper mapper = new CategoryTopicMapper(null, null);

    @Test
    void mapsEdmTopicToMusicCategory() {
        assertThat(mapper.mapTopicToCategory("edm")).isEqualTo("music");
    }

    @Test
    void mapsValorantTopicToGamingCategory() {
        assertThat(mapper.mapTopicToCategory("valorant")).isEqualTo("gaming");
    }
}
