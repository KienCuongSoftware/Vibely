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

    @Test
    void infersForYouFromHomeAndVideoPermalinkReferer() {
        assertThat(VideoViewTraffic.inferSourceFromReferer("https://vibely.sbs/"))
            .isEqualTo("foryou");
        assertThat(VideoViewTraffic.inferSourceFromReferer(
            "https://vibely.sbs/@alice/video/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
        )).isEqualTo("foryou");
        assertThat(VideoViewTraffic.inferSourceFromReferer(
            "https://vibely.sbs/@alice/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
        )).isEqualTo("profile");
        assertThat(VideoViewTraffic.inferSourceFromReferer("https://vibely.sbs/explore"))
            .isEqualTo("other");
    }

    @Test
    void applySourceDoesNotOverrideExplicitClientSource() {
        VideoViewRequest body = new VideoViewRequest(2500L, 10_000L, "search", "cats");
        VideoViewRequest applied = VideoViewTraffic.applySource(body, "https://vibely.sbs/");
        assertThat(applied.source()).isEqualTo("search");
        assertThat(applied.searchQuery()).isEqualTo("cats");
    }
}
