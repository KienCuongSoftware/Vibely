package com.vibely.backend.search;

import static org.assertj.core.api.Assertions.assertThat;

import com.vibely.backend.search.service.SearchTextNormalizer;
import org.junit.jupiter.api.Test;

class SearchTextNormalizerTest {

    @Test
    void normalizeQueryTrimsAndCollapsesWhitespace() {
        assertThat(SearchTextNormalizer.normalizeQuery("  hello   world  ")).isEqualTo("hello world");
        assertThat(SearchTextNormalizer.normalizeQuery(null)).isEmpty();
    }

    @Test
    void normalizeTrendKeywordLowercasesAndCapsLength() {
        assertThat(SearchTextNormalizer.normalizeTrendKeyword("  Hello  ")).isEqualTo("hello");
        assertThat(SearchTextNormalizer.normalizeTrendKeyword("x".repeat(250))).hasSize(200);
    }
}
