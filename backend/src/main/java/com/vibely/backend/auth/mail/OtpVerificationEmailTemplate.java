package com.vibely.backend.auth.mail;

import com.vibely.backend.auth.dto.OtpRequestMetadata;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

final class OtpVerificationEmailTemplate {

    private static final DateTimeFormatter EN_TIME =
        DateTimeFormatter.ofPattern("d MMM yyyy HH:mm 'UTC'", Locale.ENGLISH);
    private static final DateTimeFormatter VI_TIME =
        DateTimeFormatter.ofPattern("d 'thg' M, yyyy HH:mm 'UTC'", Locale.forLanguageTag("vi-VN"));

    private OtpVerificationEmailTemplate() {
    }

    static String subject(String code, EmailLocale locale) {
        return code + EmailLocales.pick(locale, " is your verification code", " là mã xác minh của bạn");
    }

    static String accountDeactivationSubject(String code, EmailLocale locale) {
        return code + EmailLocales.pick(locale, " is your 6-digit code", " là mã 6 chữ số của bạn");
    }

    static String accountReactivationSubject(String code, EmailLocale locale) {
        return code + EmailLocales.pick(
            locale,
            " is your Vibely account reactivation code",
            " là mã kích hoạt lại tài khoản Vibely"
        );
    }

    static String accountDeletionSubject(String code, EmailLocale locale) {
        return code + EmailLocales.pick(
            locale,
            " is your Vibely account deletion code",
            " là mã xóa tài khoản Vibely"
        );
    }

    static String passwordResetSubject(String code, EmailLocale locale) {
        return code + EmailLocales.pick(
            locale,
            " is your Vibely password reset code",
            " là mã đặt lại mật khẩu Vibely"
        );
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
        String safeUsername = escapeHtml(username);
        String browser = escapeHtml(metadata.browser());
        String location = escapeHtml(metadata.approximateLocation());
        String generatedAt = formatTime(locale);
        String heading = EmailLocales.pick(locale, "Vibely 6-digit code", "Mã 6 chữ số Vibely");
        String hello = EmailLocales.pick(locale, "Hello", "Xin chào");
        String yourCode = EmailLocales.pick(locale, "Your 6-digit code is:", "Mã 6 chữ số của bạn là:");
        String validFor = EmailLocales.pick(locale, "This code is valid for %s.", "Mã có hiệu lực trong %s.");
        String timeLabel = EmailLocales.pick(locale, "Time", "Thời gian");
        String locationLabel = EmailLocales.pick(locale, "Location", "Vị trí");
        String deviceLabel = EmailLocales.pick(locale, "Device", "Thiết bị");
        String onlyOfficial = EmailLocales.pick(
            locale,
            "<strong>Only enter this code on the official Vibely app or website.</strong> Do not share this code with anyone.",
            "<strong>Chỉ nhập mã này trên ứng dụng hoặc website chính thức của Vibely.</strong> Không chia sẻ mã với bất kỳ ai."
        );
        String sharing = EmailLocales.pick(
            locale,
            "Sharing this code may allow others to access your Vibely account along with related personal information and content.",
            "Chia sẻ mã này có thể giúp người khác truy cập tài khoản Vibely cùng thông tin và nội dung liên quan."
        );
        String safety = EmailLocales.pick(
            locale,
            "For your safety:<br />• Be careful with suspicious links or messages asking for login details.<br />• Contact Vibely support at %s if you need help.",
            "Để bảo vệ tài khoản:<br />• Cẩn thận với liên kết hoặc tin nhắn đáng ngờ yêu cầu thông tin đăng nhập.<br />• Liên hệ hỗ trợ Vibely tại %s nếu bạn cần trợ giúp."
        );
        String bodyRows = VibelyEmailLayout.headingRow(heading) + """
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
                hello,
                safeUsername,
                yourCode,
                code,
                actionLineHtml,
                validFor.formatted(expiryLabel),
                timeLabel,
                generatedAt,
                locationLabel,
                location,
                deviceLabel,
                browser,
                onlyOfficial,
                sharing,
                notYouLine,
                safety.formatted(VibelyEmailLayout.supportEmailLink())
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
        String safeUsername = escapeHtml(username);
        String action = EmailLocales.pick(
            locale,
            "Use this code to verify that <strong>@%s</strong> is your Vibely account before deactivating.".formatted(safeUsername),
            "Dùng mã này để xác nhận <strong>@%s</strong> là tài khoản Vibely của bạn trước khi vô hiệu hóa.".formatted(safeUsername)
        );
        String notYou = EmailLocales.pick(
            locale,
            "If you did not request this code, someone may be trying to access your account. Change your password in Vibely now.",
            "Nếu bạn không yêu cầu mã này, có thể ai đó đang cố truy cập tài khoản. Hãy đổi mật khẩu trên Vibely ngay."
        );
        return accountDeactivationHtmlBody(
            username,
            code,
            expiryLabel,
            helpUrl,
            metadata,
            locale,
            action,
            EmailLocales.pick(locale, "Vibely account deactivation code", "Mã vô hiệu hóa tài khoản Vibely"),
            notYou
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
                EmailLocales.pick(locale, "Vibely 6-digit code", "Mã 6 chữ số Vibely"),
                EmailLocales.pick(locale, "Hello", "Xin chào"),
                username,
                EmailLocales.pick(locale, "Your 6-digit code is:", "Mã 6 chữ số của bạn là:"),
                code,
                EmailLocales.pick(
                    locale,
                    "Use this code to verify that @" + username + " is your Vibely account before deactivating.",
                    "Dùng mã này để xác nhận @" + username + " là tài khoản Vibely của bạn trước khi vô hiệu hóa."
                ),
                EmailLocales.pick(locale, "This code is valid for " + expiryLabel + ".", "Mã có hiệu lực trong " + expiryLabel + "."),
                EmailLocales.pick(locale, "Time", "Thời gian"),
                formatTime(locale),
                EmailLocales.pick(locale, "Location", "Vị trí"),
                metadata.approximateLocation(),
                EmailLocales.pick(locale, "Device", "Thiết bị"),
                metadata.browser(),
                EmailLocales.pick(
                    locale,
                    "Only enter this code on the official Vibely app or website. Do not share this code with anyone.",
                    "Chỉ nhập mã này trên ứng dụng hoặc website chính thức của Vibely. Không chia sẻ mã với bất kỳ ai."
                ),
                EmailLocales.pick(
                    locale,
                    "If you did not request this code, change your password in Vibely now.",
                    "Nếu bạn không yêu cầu mã này, hãy đổi mật khẩu trên Vibely ngay."
                )
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
        String safeUsername = escapeHtml(username);
        String action = EmailLocales.pick(
            locale,
            "Use this code to verify that <strong>@%s</strong> is your Vibely account before reactivating.".formatted(safeUsername),
            "Dùng mã này để xác nhận <strong>@%s</strong> là tài khoản Vibely của bạn trước khi kích hoạt lại.".formatted(safeUsername)
        );
        String notYou = EmailLocales.pick(
            locale,
            "If you did not request account reactivation, ignore this email and change your password in Vibely now.",
            "Nếu bạn không yêu cầu kích hoạt lại tài khoản, hãy bỏ qua email này và đổi mật khẩu trên Vibely ngay."
        );
        return accountDeactivationHtmlBody(
            username,
            code,
            expiryLabel,
            helpUrl,
            metadata,
            locale,
            action,
            EmailLocales.pick(locale, "Vibely account reactivation code", "Mã kích hoạt lại tài khoản Vibely"),
            notYou
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
                EmailLocales.pick(
                    locale,
                    "Use this code to verify that @" + username + " is your Vibely account before deactivating.",
                    "Dùng mã này để xác nhận @" + username + " là tài khoản Vibely của bạn trước khi vô hiệu hóa."
                ),
                EmailLocales.pick(
                    locale,
                    "Use this code to verify that @" + username + " is your Vibely account before reactivating.",
                    "Dùng mã này để xác nhận @" + username + " là tài khoản Vibely của bạn trước khi kích hoạt lại."
                )
            )
            .replace(
                EmailLocales.pick(
                    locale,
                    "If you did not request this code, change your password in Vibely now.",
                    "Nếu bạn không yêu cầu mã này, hãy đổi mật khẩu trên Vibely ngay."
                ),
                EmailLocales.pick(
                    locale,
                    "If you did not request account reactivation, ignore this email and change your password in Vibely now.",
                    "Nếu bạn không yêu cầu kích hoạt lại tài khoản, hãy bỏ qua email này và đổi mật khẩu trên Vibely ngay."
                )
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
        String safeUsername = escapeHtml(username);
        String action = EmailLocales.pick(
            locale,
            "Use this code to verify that <strong>@%s</strong> is your Vibely account before permanently deleting it.".formatted(safeUsername),
            "Dùng mã này để xác nhận <strong>@%s</strong> là tài khoản Vibely của bạn trước khi xóa vĩnh viễn.".formatted(safeUsername)
        );
        String notYou = EmailLocales.pick(
            locale,
            "If you did not request account deletion, someone may be trying to access your account. Change your password immediately in Vibely.",
            "Nếu bạn không yêu cầu xóa tài khoản, có thể ai đó đang cố truy cập. Hãy đổi mật khẩu ngay trên Vibely."
        );
        return accountDeactivationHtmlBody(
            username,
            code,
            expiryLabel,
            helpUrl,
            metadata,
            locale,
            action,
            EmailLocales.pick(locale, "Vibely account deletion code", "Mã xóa tài khoản Vibely"),
            notYou
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
                EmailLocales.pick(
                    locale,
                    "Use this code to verify that @" + username + " is your Vibely account before deactivating.",
                    "Dùng mã này để xác nhận @" + username + " là tài khoản Vibely của bạn trước khi vô hiệu hóa."
                ),
                EmailLocales.pick(
                    locale,
                    "Use this code to verify that @" + username + " is your Vibely account before permanently deleting it.",
                    "Dùng mã này để xác nhận @" + username + " là tài khoản Vibely của bạn trước khi xóa vĩnh viễn."
                )
            )
            .replace(
                EmailLocales.pick(
                    locale,
                    "If you did not request this code, change your password in Vibely now.",
                    "Nếu bạn không yêu cầu mã này, hãy đổi mật khẩu trên Vibely ngay."
                ),
                EmailLocales.pick(
                    locale,
                    "If you did not request account deletion, change your password immediately in Vibely.",
                    "Nếu bạn không yêu cầu xóa tài khoản, hãy đổi mật khẩu ngay trên Vibely."
                )
            );
    }

    static String passwordResetHtmlBody(String code, String expiryLabel, String helpUrl, EmailLocale locale) {
        String bodyRows = VibelyEmailLayout.headingRow(
            EmailLocales.pick(locale, "Reset password", "Đặt lại mật khẩu")
        ) + """
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
                EmailLocales.pick(
                    locale,
                    "Enter the following code on Vibely to reset your password:",
                    "Nhập mã sau trên Vibely để đặt lại mật khẩu:"
                ),
                code,
                EmailLocales.pick(locale, "This code is valid for %s.".formatted(expiryLabel), "Mã có hiệu lực trong %s.".formatted(expiryLabel)),
                EmailLocales.pick(
                    locale,
                    "If you did not request a password reset, ignore this email.",
                    "Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này."
                ),
                EmailLocales.pick(locale, "Contact Vibely support:", "Liên hệ hỗ trợ Vibely:"),
                VibelyEmailLayout.supportEmailLink()
            );
        return VibelyEmailLayout.document(
            EmailLocales.pick(locale, "Reset Vibely password", "Đặt lại mật khẩu Vibely"),
            bodyRows,
            null,
            locale
        );
    }

    static String passwordResetPlainBody(String code, String expiryLabel, EmailLocale locale) {
        return """
            %s

            %s %s

            %s

            %s
            """.formatted(
                EmailLocales.pick(locale, "Reset Vibely password", "Đặt lại mật khẩu Vibely"),
                EmailLocales.pick(locale, "Enter the following code to reset your password:", "Nhập mã sau để đặt lại mật khẩu:"),
                code,
                EmailLocales.pick(locale, "The code expires in " + expiryLabel + ".", "Mã hết hạn sau " + expiryLabel + "."),
                EmailLocales.pick(
                    locale,
                    "If you did not request this, ignore this email.",
                    "Nếu bạn không yêu cầu việc này, hãy bỏ qua email này."
                )
            ).trim();
    }

    static String htmlBody(String code, String expiryLabel, String helpUrl, EmailLocale locale) {
        String bodyRows = VibelyEmailLayout.headingRow(
            EmailLocales.pick(locale, "Vibely 6-digit code", "Mã 6 chữ số Vibely")
        ) + """
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
                EmailLocales.pick(
                    locale,
                    "To verify your account, enter the following code on Vibely:",
                    "Để xác minh tài khoản, hãy nhập mã sau trên Vibely:"
                ),
                code,
                EmailLocales.pick(locale, "This code is valid for %s.".formatted(expiryLabel), "Mã có hiệu lực trong %s.".formatted(expiryLabel)),
                EmailLocales.pick(
                    locale,
                    "If you did not request this code, you can ignore this email.",
                    "Nếu bạn không yêu cầu mã này, bạn có thể bỏ qua email."
                ),
                EmailLocales.pick(locale, "Vibely support team", "Đội ngũ hỗ trợ Vibely"),
                VibelyEmailLayout.supportEmailLink(),
                EmailLocales.pick(
                    locale,
                    "Have questions? Contact support by email or report in the app at <strong>Settings &gt; Report a problem</strong>.",
                    "Cần trợ giúp? Liên hệ email hỗ trợ hoặc báo cáo trong ứng dụng tại <strong>Cài đặt &gt; Báo cáo sự cố</strong>."
                )
            );
        return VibelyEmailLayout.document(
            EmailLocales.pick(locale, "Vibely verification code", "Mã xác minh Vibely"),
            bodyRows,
            null,
            locale
        );
    }

    static String plainBody(String code, String expiryLabel, EmailLocale locale) {
        return """
            %s

            %s %s

            %s

            %s
            """.formatted(
                EmailLocales.pick(locale, "Vibely verification code", "Mã xác minh Vibely"),
                EmailLocales.pick(
                    locale,
                    "To verify your account, enter the following code on Vibely:",
                    "Để xác minh tài khoản, hãy nhập mã sau trên Vibely:"
                ),
                code,
                EmailLocales.pick(locale, "The code expires in " + expiryLabel + ".", "Mã hết hạn sau " + expiryLabel + "."),
                EmailLocales.pick(
                    locale,
                    "If you did not request this code, ignore this email.",
                    "Nếu bạn không yêu cầu mã này, hãy bỏ qua email này."
                )
            ).trim();
    }

    static String formatExpiryLabel(int expirySeconds, EmailLocale locale) {
        if (expirySeconds >= 3600 && expirySeconds % 3600 == 0) {
            int hours = expirySeconds / 3600;
            return EmailLocales.pick(locale, hours + " hours", hours + " giờ");
        }
        int minutes = Math.max(1, (int) Math.ceil(expirySeconds / 60.0));
        return EmailLocales.pick(locale, minutes + " minutes", minutes + " phút");
    }

    private static String formatTime(EmailLocale locale) {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        return (locale != null && locale.vietnamese() ? VI_TIME : EN_TIME).format(now);
    }

    private static String escapeHtml(String raw) {
        if (raw == null || raw.isBlank()) {
            return EmailLocales.pick(EmailLocale.EN, "Vibely user", "người dùng Vibely");
        }
        return raw.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;")
            .replace("'", "&#39;");
    }
}
