package com.vibely.backend.security;

import java.util.List;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class InternalTokenSecurityTest {

    @Test
    void matchesAnyAcceptsConfiguredWorkerToken() {
        assertThat(InternalTokenSecurity.matchesAny(
            List.of("worker-a-token-value-xxxxx", "worker-b-token-value-yyyyy"),
            "worker-b-token-value-yyyyy"
        )).isTrue();
    }

    @Test
    void matchesAnyRejectsUnknownToken() {
        assertThat(InternalTokenSecurity.matchesAny(
            List.of("worker-a-token-value-xxxxx"),
            "nope"
        )).isFalse();
        assertThat(InternalTokenSecurity.matchesAny(List.of("worker-a-token-value-xxxxx"), null)).isFalse();
    }
}
