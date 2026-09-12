package com.vibely.backend.auth.mail;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class EmailLocalesTest {

    @Test
    void resolvesUiLocalesToMatchingCopyTags() {
        assertThat(EmailLocales.resolve("vi").tag()).isEqualTo("vi");
        assertThat(EmailLocales.resolve("vi-VN").tag()).isEqualTo("vi");
        assertThat(EmailLocales.resolve("en").tag()).isEqualTo("en");
        assertThat(EmailLocales.resolve("ja").tag()).isEqualTo("ja");
        assertThat(EmailLocales.resolve("zh-Hans").tag()).isEqualTo("zh-Hans");
        assertThat(EmailLocales.resolve("ar").tag()).isEqualTo("ar");
    }

    @Test
    void prefersFirstNonBlankCandidate() {
        assertThat(EmailLocales.resolve("vi", "en").tag()).isEqualTo("vi");
        assertThat(EmailLocales.resolve(null, "en").tag()).isEqualTo("en");
        assertThat(EmailLocales.resolve()).isEqualTo(EmailLocale.EN);
    }

    @Test
    void otpSubjectFollowsLocale() {
        EmailLocale vi = EmailLocales.resolve("vi");
        EmailLocale ja = EmailLocales.resolve("ja");
        assertThat(OtpVerificationEmailTemplate.subject("123456", EmailLocale.EN))
            .isEqualTo("123456 is your verification code");
        assertThat(OtpVerificationEmailTemplate.subject("123456", vi))
            .isEqualTo("123456 là mã xác minh của bạn");
        assertThat(OtpVerificationEmailTemplate.subject("123456", ja))
            .contains("123456")
            .doesNotContain("is your verification code");
        assertThat(OtpVerificationEmailTemplate.formatExpiryLabel(600, vi))
            .isEqualTo("10 phút");
        assertThat(OtpVerificationEmailTemplate.htmlBody("123456", "10 phút", "/help", vi))
            .contains("lang=\"vi\"")
            .contains("Để xác minh tài khoản");
        assertThat(OtpVerificationEmailTemplate.htmlBody("123456", "10 minutes", "/help", ja))
            .contains("lang=\"ja\"")
            .contains("dir=\"ltr\"");
        assertThat(OtpVerificationEmailTemplate.htmlBody("123456", "10 minutes", "/help", EmailLocales.resolve("ar")))
            .contains("lang=\"ar\"")
            .contains("dir=\"rtl\"");
    }
}
