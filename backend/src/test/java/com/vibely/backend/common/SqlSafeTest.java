package com.vibely.backend.common;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Sort;

class SqlSafeTest {

    @Test
    void escapeLike_escapesWildcardsAndBackslash() {
        assertThat(SqlSafe.escapeLike("100%_off\\")).isEqualTo("100\\%\\_off\\\\");
    }

    @Test
    void sanitizeLikeTerm_trimsNormalizesAndEscapes() {
        assertThat(SqlSafe.sanitizeLikeTerm("  hello   %world  ", 50))
            .isEqualTo("hello \\%world");
    }

    @Test
    void requireIdentifierSlug_acceptsValidSlug() {
        assertThat(SqlSafe.requireIdentifierSlug(" Dance-24 ")).isEqualTo("dance-24");
    }

    @Test
    void requireIdentifierSlug_rejectsInjectionLikeSlug() {
        assertThatThrownBy(() -> SqlSafe.requireIdentifierSlug("foo'; drop table users;--"))
            .isInstanceOf(BadRequestException.class);
    }

    @Test
    void escapeRegexLiteral_escapesRegexOperators() {
        assertThat(SqlSafe.escapeRegexLiteral("dance+")).isEqualTo("dance\\+");
    }

    @Test
    void pageRequest_clampsBounds() {
        assertThat(SqlSafe.pageRequest(-1, 500, 100).getPageNumber()).isZero();
        assertThat(SqlSafe.pageRequest(-1, 500, 100).getPageSize()).isEqualTo(100);
    }

    @Test
    void pageRequest_rejectsUnsafeSortProperty() {
        assertThatThrownBy(() -> SqlSafe.pageRequest(0, 20, 100, Sort.by("id;drop")))
            .isInstanceOf(BadRequestException.class);
    }
}
