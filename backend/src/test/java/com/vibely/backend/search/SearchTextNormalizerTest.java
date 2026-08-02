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
    void normalizeQueryLowercasesAndSanitizes() {
        assertThat(SearchTextNormalizer.normalizeQuery("  Music  ")).isEqualTo("music");
        assertThat(SearchTextNormalizer.normalizeQuery("#Dance")).isEqualTo("dance");
        assertThat(SearchTextNormalizer.normalizeQuery("Hình Nền <script>")).isEqualTo("hình nền script");
        assertThat(SearchTextNormalizer.normalizeQuery("a\nb\tc")).isEqualTo("a b c");
        assertThat(SearchTextNormalizer.normalizeQuery("x".repeat(250)))
            .hasSize(SearchTextNormalizer.MAX_QUERY_LENGTH);
    }

    @Test
    void normalizeTrendKeywordLowercasesAndCapsLength() {
        assertThat(SearchTextNormalizer.normalizeTrendKeyword("  Hello  ")).isEqualTo("hello");
        assertThat(SearchTextNormalizer.normalizeTrendKeyword("x".repeat(250))).hasSize(200);
    }

    @Test
    void foldForSearchStripsVietnameseDiacritics() {
        assertThat(SearchTextNormalizer.foldForSearch("Hình nền động"))
            .isEqualTo("hinh nen dong");
        assertThat(SearchTextNormalizer.foldForSearch("hinh nen dong"))
            .isEqualTo("hinh nen dong");
        assertThat(SearchTextNormalizer.foldForSearch("Động")).isEqualTo("dong");
    }
}
