package com.vibely.backend.user;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class AccountRegionCodesTest {

    @Test
    void allowsVietnamAndKosovo() {
        assertThat(AccountRegionCodes.isAllowed("vn")).isTrue();
        assertThat(AccountRegionCodes.isAllowed("XK")).isTrue();
        assertThat(AccountRegionCodes.normalize("vn")).isEqualTo("VN");
    }

    @Test
    void rejectsUnknown() {
        assertThat(AccountRegionCodes.isAllowed("ZZ")).isFalse();
        assertThat(AccountRegionCodes.normalizeOrDefault("ZZ")).isEqualTo("VN");
    }
}
