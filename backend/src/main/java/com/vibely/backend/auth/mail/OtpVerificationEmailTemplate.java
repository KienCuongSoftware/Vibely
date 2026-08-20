package com.vibely.backend.auth.mail;

import com.vibely.backend.auth.dto.OtpRequestMetadata;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

final class OtpVerificationEmailTemplate {

    private static final DateTimeFormatter EMAIL_TIME_FORMATTER =
        DateTimeFormatter.ofPattern("d 'thg' M, yyyy HH:mm 'UTC'", Locale.forLanguageTag("vi-VN"));

    private OtpVerificationEmailTemplate() {
    }

    static String subject(String code) {
        return code + " is your verification code";
    }

    static String accountDeactivationSubject(String code) {
        return code + " is your 6-digit code";
    }

    static String accountReactivationSubject(String code) {
        return code + " is your Vibely account reactivation code";
    }

    static String accountDeletionSubject(String code) {
        return code + " is your Vibely account deletion code";
    }

    static String accountDeactivationHtmlBody(
        String username,
        String code,
        String expiryLabel,
        String helpUrl,
        OtpRequestMetadata metadata
    ) {
        String safeUsername = escapeHtml(username);
        String browser = escapeHtml(metadata.browser());
        String location = escapeHtml(metadata.approximateLocation());
        String generatedAt = EMAIL_TIME_FORMATTER.format(OffsetDateTime.now(ZoneOffset.UTC));
        String bodyRows = VibelyEmailLayout.headingRow("Vibely 6-digit code") + """
            <tr>
              <td style="padding:0 56px 8px;font-size:15px;line-height:1.7;color:#161823;">
                <p style="margin:0 0 16px;">Hello <strong>%s</strong>,</p>
                <p style="margin:0 0 16px;">Your 6-digit code is: <strong style="font-size:18px;letter-spacing:0.5px;">%s</strong></p>
                <p style="margin:0 0 18px;">Use this code to verify that <strong>@%s</strong> is your Vibely account before deactivating.</p>
                <p style="margin:0 0 24px;text-align:center;color:#6b7280;">This code is valid for %s.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 56px 24px;">
                <div style="background:#f7f7f8;border-radius:10px;padding:18px 20px;font-size:14px;line-height:1.7;color:#4b5563;">
                  <div>Time: <strong style="color:#161823;">%s</strong></div>
                  <div>Location: <strong style="color:#161823;">%s</strong></div>
                  <div>Device: <strong style="color:#161823;">%s</strong></div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 56px 28px;font-size:14px;line-height:1.65;color:#161823;">
                <p style="margin:0 0 14px;"><strong>Only enter this code on the official Vibely app or website.</strong> Do not share this code with anyone.</p>
                <p style="margin:0 0 14px;">Sharing this code may allow others to access your Vibely account along with related personal information and content.</p>
                <p style="margin:0 0 14px;">If you did not request this code, someone may be trying to access your account. Change your password in Vibely now.</p>
                <p style="margin:0;">For your safety:<br />• Be careful with suspicious links or messages asking for login details.<br />• Contact Vibely support at %s if you need help.</p>
              </td>
            </tr>
            """.formatted(
                safeUsername,
                code,
                safeUsername,
                expiryLabel,
                generatedAt,
                location,
                browser,
                VibelyEmailLayout.supportEmailLink()
            );
        return VibelyEmailLayout.document("Vibely account deactivation code", bodyRows, username);
    }

    static String accountDeactivationPlainBody(
        String username,
        String code,
        String expiryLabel,
        OtpRequestMetadata metadata
    ) {
        return """
            Vibely 6-digit code

            Hello %s,

            Your 6-digit code is: %s

            Use this code to verify that @%s is your Vibely account before deactivating.
            This code is valid for %s.

            Time: %s
            Location: %s
            Device: %s

            Only enter this code on the official Vibely app or website. Do not share this code with anyone.
            If you did not request this code, change your password in Vibely now.
            """.formatted(
                username,
                code,
                username,
                expiryLabel,
                EMAIL_TIME_FORMATTER.format(OffsetDateTime.now(ZoneOffset.UTC)),
                metadata.approximateLocation(),
                metadata.browser()
            ).trim();
    }

    static String accountReactivationHtmlBody(
        String username,
        String code,
        String expiryLabel,
        String helpUrl,
        OtpRequestMetadata metadata
    ) {
        return accountDeactivationHtmlBody(username, code, expiryLabel, helpUrl, metadata)
            .replace("<title>Vibely account deactivation code</title>", "<title>Vibely account reactivation code</title>")
            .replace(
                "Use this code to verify that <strong>@%s</strong> is your Vibely account before deactivating."
                    .formatted(escapeHtml(username)),
                "Use this code to verify that <strong>@%s</strong> is your Vibely account before reactivating."
                    .formatted(escapeHtml(username))
            )
            .replace(
                "If you did not request this code, someone may be trying to access your account. Change your password in Vibely now.",
                "If you did not request account reactivation, ignore this email and change your password in Vibely now."
            );
    }

    static String accountReactivationPlainBody(
        String username,
        String code,
        String expiryLabel,
        OtpRequestMetadata metadata
    ) {
        return accountDeactivationPlainBody(username, code, expiryLabel, metadata)
            .replace(
                "Use this code to verify that @" + username + " is your Vibely account before deactivating.",
                "Use this code to verify that @" + username + " is your Vibely account before reactivating."
            )
            .replace(
                "If you did not request this code, change your password in Vibely now.",
                "If you did not request account reactivation, ignore this email and change your password in Vibely now."
            );
    }

    static String accountDeletionHtmlBody(
        String username,
        String code,
        String expiryLabel,
        String helpUrl,
        OtpRequestMetadata metadata
    ) {
        String safeUsername = escapeHtml(username);
        return accountDeactivationHtmlBody(username, code, expiryLabel, helpUrl, metadata)
            .replace("<title>Vibely account deactivation code</title>", "<title>Vibely account deletion code</title>")
            .replace(
                "Use this code to verify that <strong>@%s</strong> is your Vibely account before deactivating."
                    .formatted(safeUsername),
                "Use this code to verify that <strong>@%s</strong> is your Vibely account before permanently deleting it."
                    .formatted(safeUsername)
            )
            .replace(
                "If you did not request this code, someone may be trying to access your account. Change your password in Vibely now.",
                "If you did not request account deletion, someone may be trying to access your account. Change your password immediately in Vibely."
            );
    }

    static String accountDeletionPlainBody(
        String username,
        String code,
        String expiryLabel,
        OtpRequestMetadata metadata
    ) {
        return accountDeactivationPlainBody(username, code, expiryLabel, metadata)
            .replace(
                "Use this code to verify that @" + username + " is your Vibely account before deactivating.",
                "Use this code to verify that @" + username + " is your Vibely account before permanently deleting it."
            )
            .replace(
                "If you did not request this code, change your password in Vibely now.",
                "If you did not request account deletion, change your password immediately in Vibely."
            );
    }

    static String passwordResetHtmlBody(String code, String expiryLabel, String helpUrl) {
        String bodyRows = VibelyEmailLayout.headingRow("Reset password") + """
            <tr>
              <td style="padding:0 56px 8px;font-size:15px;line-height:1.7;color:#161823;">
                <p style="margin:0 0 16px;">Enter the following code on Vibely to reset your password:</p>
                <p style="margin:0 0 16px;text-align:center;font-size:32px;font-weight:800;letter-spacing:4px;color:#161823;">%s</p>
                <p style="margin:0 0 24px;text-align:center;color:#6b7280;">This code is valid for %s.</p>
                <p style="margin:0;">If you did not request a password reset, ignore this email.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 56px 28px;font-size:14px;line-height:1.65;color:#161823;">
                <p style="margin:0;">Contact Vibely support: %s</p>
              </td>
            </tr>
            """.formatted(code, expiryLabel, VibelyEmailLayout.supportEmailLink());
        return VibelyEmailLayout.document("Reset Vibely password", bodyRows, null);
    }

    static String passwordResetPlainBody(String code, String expiryLabel) {
        return """
            Reset Vibely password

            Enter the following code to reset your password: %s

            The code expires in %s.

            If you did not request this, ignore this email.
            """.formatted(code, expiryLabel).trim();
    }

    static String htmlBody(String code, String expiryLabel, String helpUrl) {
        String bodyRows = VibelyEmailLayout.headingRow("Vibely 6-digit code") + """
            <tr>
              <td style="padding:0 56px 8px;font-size:15px;line-height:1.7;color:#161823;">
                <p style="margin:0 0 16px;">To verify your account, enter the following code on Vibely:</p>
                <p style="margin:0 0 16px;text-align:center;font-size:32px;font-weight:800;letter-spacing:4px;color:#161823;">%s</p>
                <p style="margin:0 0 24px;text-align:center;color:#6b7280;">This code is valid for %s.</p>
                <p style="margin:0;">If you did not request this code, you can ignore this email.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 56px 28px;font-size:14px;line-height:1.65;color:#161823;">
                <p style="margin:0 0 8px;">Vibely support team · %s</p>
                <p style="margin:0;">Have questions? Contact support by email or report in the app at <strong>Settings &gt; Report a problem</strong>.</p>
              </td>
            </tr>
            """.formatted(code, expiryLabel, VibelyEmailLayout.supportEmailLink());
        return VibelyEmailLayout.document("Vibely verification code", bodyRows, null);
    }

    static String plainBody(String code, String expiryLabel) {
        return """
            Vibely verification code

            To verify your account, enter the following code on Vibely: %s

            The code expires in %s.

            If you did not request this code, ignore this email.
            """.formatted(code, expiryLabel).trim();
    }

    static String formatExpiryLabel(int expirySeconds) {
        if (expirySeconds >= 3600 && expirySeconds % 3600 == 0) {
            int hours = expirySeconds / 3600;
            return hours + " hours";
        }
        int minutes = Math.max(1, (int) Math.ceil(expirySeconds / 60.0));
        return minutes + " minutes";
    }

    private static String escapeHtml(String raw) {
        if (raw == null || raw.isBlank()) {
            return "Vibely user";
        }
        return raw.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;")
            .replace("'", "&#39;");
    }
}
