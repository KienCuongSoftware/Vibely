package com.vibely.backend.user;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class MessageDmAudienceTest {

    @Test
    void allowsRequestByDefault() {
        assertThat(MessageDmAudience.normalizeOrDefault(null)).isEqualTo("REQUEST");
        assertThat(MessageDmAudience.allowsMessaging("REQUEST")).isTrue();
        assertThat(MessageDmAudience.allowsMessaging("OFF")).isFalse();
    }

    @Test
    void rejectsUnknown() {
        assertThat(MessageDmAudience.isAllowed("EVERYONE")).isFalse();
        assertThat(MessageDmAudience.normalizeOrDefault("EVERYONE")).isEqualTo("REQUEST");
    }
}
