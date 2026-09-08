package com.vibely.backend.video;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class VideoViewTrafficTest {

    @Test
    void unknownSourceBecomesOther() {
        assertThat(VideoViewTraffic.normalizeSource(null)).isEqualTo("other");
        assertThat(VideoViewTraffic.normalizeSource("ForYou")).isEqualTo("foryou");
        assertThat(VideoViewTraffic.normalizeSource("spam")).isEqualTo("other");
    }

    @Test
    void searchQueryIsTrimmedAndCapped() {
        assertThat(VideoViewTraffic.normalizeSearchQuery("profile", "hello")).isNull();
        assertThat(VideoViewTraffic.normalizeSearchQuery("search", "  dance  trend  "))
            .isEqualTo("dance trend");
        assertThat(VideoViewTraffic.normalizeSearchQuery("search", "x".repeat(90)))
            .hasSize(VideoViewTraffic.SEARCH_QUERY_MAX);
    }
}
