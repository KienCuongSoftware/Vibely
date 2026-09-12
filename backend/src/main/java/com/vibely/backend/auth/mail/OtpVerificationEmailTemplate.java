package com.vibely.backend.auth.mail;

import com.vibely.backend.auth.dto.OtpRequestMetadata;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

final class OtpVerificationEmailTemplate {

    private OtpVerificationEmailTemplate() {
    }

    static String subject(String code, EmailLocale locale) {
        return code + MailCopy.get(locale, "otp.subjectSuffix");
    }

    static String accountDeactivationSubject(String code, EmailLocale locale) {
        return code + MailCopy.get(locale, "otp.sixDigitSubjectSuffix");
    }

    static String accountReactivationSubject(String code, EmailLocale locale) {
        return code + MailCopy.get(locale, "otp.reactivationSubjectSuffix");
    }

    static String accountDeletionSubject(String code, EmailLocale locale) {
        return code + MailCopy.get(locale, "otp.deletionSubjectSuffix");
    }

    static String passwordResetSubject(String code, EmailLocale locale) {
        return code + MailCopy.get(locale, "otp.resetSubjectSuffix");
    }

    static String accountDeactivationHtmlBody(
        String username,
        String code,
        String expiryLabel,
        String helpUrl,
        OtpRequestMetadata metadata,
        EmailLocale locale,
        String actionLineHtml,
        String title,
        String notYouLine
    ) {
        String safeUsername = escapeHtml(username, locale);
        String browser = escapeHtml(metadata.browser(), locale);
        String location = escapeHtml(metadata.approximateLocation(), locale);
        String generatedAt = formatTime(locale);
        String bodyRows = VibelyEmailLayout.headingRow(MailCopy.get(locale, "otp.heading")) + """
            <tr>
              <td style="padding:0 56px 8px;font-size:15px;line-height:1.7;color:#161823;">
                <p style="margin:0 0 16px;">%s <strong>%s</strong>,</p>
                <p style="margin:0 0 16px;">%s <strong style="font-size:18px;letter-spacing:0.5px;">%s</strong></p>
                <p style="margin:0 0 18px;">%s</p>
                <p style="margin:0 0 24px;text-align:center;color:#6b7280;">%s</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 56px 24px;">
                <div style="background:#f7f7f8;border-radius:10px;padding:18px 20px;font-size:14px;line-height:1.7;color:#4b5563;">
                  <div>%s: <strong style="color:#161823;">%s</strong></div>
                  <div>%s: <strong style="color:#161823;">%s</strong></div>
                  <div>%s: <strong style="color:#161823;">%s</strong></div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 56px 28px;font-size:14px;line-height:1.65;color:#161823;">
                <p style="margin:0 0 14px;">%s</p>
                <p style="margin:0 0 14px;">%s</p>
                <p style="margin:0 0 14px;">%s</p>
                <p style="margin:0;">%s</p>
              </td>
            </tr>
            """.formatted(
                MailCopy.get(locale, "common.hello"),
                safeUsername,
                MailCopy.get(locale, "otp.yourCode"),
                code,
                actionLineHtml,
                MailCopy.get(locale, "otp.validFor", expiryLabel),
                MailCopy.get(locale, "common.time"),
                generatedAt,
                MailCopy.get(locale, "common.location"),
                location,
                MailCopy.get(locale, "common.device"),
                browser,
                MailCopy.get(locale, "otp.onlyOfficialHtml"),
                MailCopy.get(locale, "otp.sharing"),
                notYouLine,
                MailCopy.get(locale, "otp.safetyHtml", VibelyEmailLayout.supportEmailLink())
            );
        return VibelyEmailLayout.document(title, bodyRows, username, locale);
    }

    static String accountDeactivationHtmlBody(
        String username,
        String code,
        String expiryLabel,
        String helpUrl,
        OtpRequestMetadata metadata,
        EmailLocale locale
    ) {
        String safeUsername = escapeHtml(username, locale);
        return accountDeactivationHtmlBody(
            username,
            code,
            expiryLabel,
            helpUrl,
            metadata,
            locale,
            MailCopy.get(locale, "otp.deactivationActionHtml", safeUsername),
            MailCopy.get(locale, "otp.deactivationTitle"),
            MailCopy.get(locale, "otp.deactivationNotYou")
        );
    }

    static String accountDeactivationPlainBody(
        String username,
        String code,
        String expiryLabel,
        OtpRequestMetadata metadata,
        EmailLocale locale
    ) {
        return """
            %s

            %s %s,

            %s %s

            %s
            %s

            %s: %s
            %s: %s
            %s: %s

            %s
            %s
            """.formatted(
                MailCopy.get(locale, "otp.heading"),
                MailCopy.get(locale, "common.hello"),
                username,
                MailCopy.get(locale, "otp.yourCode"),
                code,
                MailCopy.get(locale, "otp.deactivationActionPlain", username),
                MailCopy.get(locale, "otp.validFor", expiryLabel),
                MailCopy.get(locale, "common.time"),
                formatTime(locale),
                MailCopy.get(locale, "common.location"),
                metadata.approximateLocation(),
                MailCopy.get(locale, "common.device"),
                metadata.browser(),
                MailCopy.get(locale, "otp.plainOnlyOfficial"),
                MailCopy.get(locale, "otp.plainNotYouGeneric")
            ).trim();
    }

    static String accountReactivationHtmlBody(
        String username,
        String code,
        String expiryLabel,
        String helpUrl,
        OtpRequestMetadata metadata,
        EmailLocale locale
    ) {
        String safeUsername = escapeHtml(username, locale);
        return accountDeactivationHtmlBody(
            username,
            code,
            expiryLabel,
            helpUrl,
            metadata,
            locale,
            MailCopy.get(locale, "otp.reactivationActionHtml", safeUsername),
            MailCopy.get(locale, "otp.reactivationTitle"),
            MailCopy.get(locale, "otp.reactivationNotYou")
        );
    }

    static String accountReactivationPlainBody(
        String username,
        String code,
        String expiryLabel,
        OtpRequestMetadata metadata,
        EmailLocale locale
    ) {
        return accountDeactivationPlainBody(username, code, expiryLabel, metadata, locale)
            .replace(
                MailCopy.get(locale, "otp.deactivationActionPlain", username),
                MailCopy.get(locale, "otp.reactivationActionPlain", username)
            )
            .replace(
                MailCopy.get(locale, "otp.plainNotYouGeneric"),
                MailCopy.get(locale, "otp.reactivationNotYou")
            );
    }

    static String accountDeletionHtmlBody(
        String username,
        String code,
        String expiryLabel,
        String helpUrl,
        OtpRequestMetadata metadata,
        EmailLocale locale
    ) {
        String safeUsername = escapeHtml(username, locale);
        return accountDeactivationHtmlBody(
            username,
            code,
            expiryLabel,
            helpUrl,
            metadata,
            locale,
            MailCopy.get(locale, "otp.deletionActionHtml", safeUsername),
            MailCopy.get(locale, "otp.deletionTitle"),
            MailCopy.get(locale, "otp.deletionNotYou")
        );
    }

    static String accountDeletionPlainBody(
        String username,
        String code,
        String expiryLabel,
        OtpRequestMetadata metadata,
        EmailLocale locale
    ) {
        return accountDeactivationPlainBody(username, code, expiryLabel, metadata, locale)
            .replace(
                MailCopy.get(locale, "otp.deactivationActionPlain", username),
                MailCopy.get(locale, "otp.deletionActionPlain", username)
            )
            .replace(
                MailCopy.get(locale, "otp.plainNotYouGeneric"),
                MailCopy.get(locale, "otp.deletionPlainNotYou")
            );
    }

    static String passwordResetHtmlBody(String code, String expiryLabel, String helpUrl, EmailLocale locale) {
        String bodyRows = VibelyEmailLayout.headingRow(MailCopy.get(locale, "otp.resetHeading")) + """
            <tr>
              <td style="padding:0 56px 8px;font-size:15px;line-height:1.7;color:#161823;">
                <p style="margin:0 0 16px;">%s</p>
                <p style="margin:0 0 16px;text-align:center;font-size:32px;font-weight:800;letter-spacing:4px;color:#161823;">%s</p>
                <p style="margin:0 0 24px;text-align:center;color:#6b7280;">%s</p>
                <p style="margin:0;">%s</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 56px 28px;font-size:14px;line-height:1.65;color:#161823;">
                <p style="margin:0;">%s %s</p>
              </td>
            </tr>
            """.formatted(
                MailCopy.get(locale, "otp.resetIntro"),
                code,
                MailCopy.get(locale, "otp.validFor", expiryLabel),
                MailCopy.get(locale, "otp.resetIgnore"),
                MailCopy.get(locale, "otp.resetContact"),
                VibelyEmailLayout.supportEmailLink()
            );
        return VibelyEmailLayout.document(MailCopy.get(locale, "otp.resetTitle"), bodyRows, null, locale);
    }

    static String passwordResetPlainBody(String code, String expiryLabel, EmailLocale locale) {
        return """
            %s

            %s %s

            %s

            %s
            """.formatted(
                MailCopy.get(locale, "otp.resetTitle"),
                MailCopy.get(locale, "otp.resetPlainIntro"),
                code,
                MailCopy.get(locale, "otp.expiresIn", expiryLabel),
                MailCopy.get(locale, "otp.resetPlainIgnore")
            ).trim();
    }

    static String htmlBody(String code, String expiryLabel, String helpUrl, EmailLocale locale) {
        String bodyRows = VibelyEmailLayout.headingRow(MailCopy.get(locale, "otp.heading")) + """
            <tr>
              <td style="padding:0 56px 8px;font-size:15px;line-height:1.7;color:#161823;">
                <p style="margin:0 0 16px;">%s</p>
                <p style="margin:0 0 16px;text-align:center;font-size:32px;font-weight:800;letter-spacing:4px;color:#161823;">%s</p>
                <p style="margin:0 0 24px;text-align:center;color:#6b7280;">%s</p>
                <p style="margin:0;">%s</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 56px 28px;font-size:14px;line-height:1.65;color:#161823;">
                <p style="margin:0 0 8px;">%s · %s</p>
                <p style="margin:0;">%s</p>
              </td>
            </tr>
            """.formatted(
                MailCopy.get(locale, "otp.verifyIntro"),
                code,
                MailCopy.get(locale, "otp.validFor", expiryLabel),
                MailCopy.get(locale, "otp.ignoreCode"),
                MailCopy.get(locale, "otp.supportTeam"),
                VibelyEmailLayout.supportEmailLink(),
                MailCopy.get(locale, "otp.supportHintHtml")
            );
        return VibelyEmailLayout.document(MailCopy.get(locale, "otp.verifyTitle"), bodyRows, null, locale);
    }

    static String plainBody(String code, String expiryLabel, EmailLocale locale) {
        return """
            %s

            %s %s

            %s

            %s
            """.formatted(
                MailCopy.get(locale, "otp.verifyTitle"),
                MailCopy.get(locale, "otp.verifyIntro"),
                code,
                MailCopy.get(locale, "otp.expiresIn", expiryLabel),
                MailCopy.get(locale, "otp.plainIgnore")
            ).trim();
    }

    static String formatExpiryLabel(int expirySeconds, EmailLocale locale) {
        if (expirySeconds >= 3600 && expirySeconds % 3600 == 0) {
            return MailCopy.get(locale, "common.hours", expirySeconds / 3600);
        }
        int minutes = Math.max(1, (int) Math.ceil(expirySeconds / 60.0));
        return MailCopy.get(locale, "common.minutes", minutes);
    }

    private static String formatTime(EmailLocale locale) {
        EmailLocale resolved = locale == null ? EmailLocale.EN : locale;
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("d MMM yyyy HH:mm 'UTC'", resolved.toJavaLocale());
        return OffsetDateTime.now(ZoneOffset.UTC).format(formatter);
    }

    private static String escapeHtml(String raw, EmailLocale locale) {
        if (raw == null || raw.isBlank()) {
            return MailCopy.get(locale, "otp.guestName");
        }
        return raw.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;")
            .replace("'", "&#39;");
    }
}
