package com.vibely.backend.auth.mail;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class EmailLocalesTest {

    @Test
    void resolvesVietnameseFromUiLocale() {
        assertThat(EmailLocales.resolve("vi")).isEqualTo(EmailLocale.VI);
        assertThat(EmailLocales.resolve("vi-VN")).isEqualTo(EmailLocale.VI);
        assertThat(EmailLocales.resolve("en")).isEqualTo(EmailLocale.EN);
        assertThat(EmailLocales.resolve("ja")).isEqualTo(EmailLocale.EN);
    }

    @Test
    void prefersFirstNonBlankCandidate() {
        assertThat(EmailLocales.resolve("vi", "en")).isEqualTo(EmailLocale.VI);
        assertThat(EmailLocales.resolve(null, "en")).isEqualTo(EmailLocale.EN);
        assertThat(EmailLocales.resolve()).isEqualTo(EmailLocale.EN);
    }

    @Test
    void otpSubjectFollowsLocale() {
        assertThat(OtpVerificationEmailTemplate.subject("123456", EmailLocale.EN))
            .isEqualTo("123456 is your verification code");
        assertThat(OtpVerificationEmailTemplate.subject("123456", EmailLocale.VI))
            .isEqualTo("123456 là mã xác minh của bạn");
        assertThat(OtpVerificationEmailTemplate.formatExpiryLabel(600, EmailLocale.VI))
            .isEqualTo("10 phút");
        assertThat(OtpVerificationEmailTemplate.htmlBody("123456", "10 phút", "/help", EmailLocale.VI))
            .contains("lang=\"vi\"")
            .contains("Để xác minh tài khoản");
    }
}
