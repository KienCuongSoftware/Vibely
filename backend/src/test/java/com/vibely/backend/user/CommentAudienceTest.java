package com.vibely.backend.user;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class CommentAudienceTest {

    @Test
    void normalizesKnownValues() {
        assertThat(CommentAudience.normalizeOrDefault("friends")).isEqualTo("FRIENDS");
        assertThat(CommentAudience.normalizeOrDefault("EVERYONE")).isEqualTo("EVERYONE");
    }

    @Test
    void defaultsUnknown() {
        assertThat(CommentAudience.isAllowed("NOBODY")).isFalse();
        assertThat(CommentAudience.normalizeOrDefault("NOBODY")).isEqualTo("EVERYONE");
    }
}
