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
        return code + " là mã xác minh của bạn";
    }

    static String accountDeactivationSubject(String code) {
        return code + " là mã 6 chữ số của bạn";
    }

    static String accountReactivationSubject(String code) {
        return code + " là mã kích hoạt lại tài khoản Vibely";
    }

    static String accountDeletionSubject(String code) {
        return code + " là mã xóa tài khoản Vibely";
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
        String bodyRows = VibelyEmailLayout.headingRow("Mã 6 chữ số Vibely") + """
            <tr>
              <td style="padding:0 56px 8px;font-size:15px;line-height:1.7;color:#161823;">
                <p style="margin:0 0 16px;">Xin chào <strong>%s</strong>,</p>
                <p style="margin:0 0 16px;">Mã 6 chữ số của bạn là: <strong style="font-size:18px;letter-spacing:0.5px;">%s</strong></p>
                <p style="margin:0 0 18px;">Hãy dùng mã này để xác minh rằng <strong>@%s</strong> là tài khoản Vibely của bạn trước khi hủy kích hoạt.</p>
                <p style="margin:0 0 24px;text-align:center;color:#6b7280;">Mã này có hiệu lực trong %s.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 56px 24px;">
                <div style="background:#f7f7f8;border-radius:10px;padding:18px 20px;font-size:14px;line-height:1.7;color:#4b5563;">
                  <div>Thời gian: <strong style="color:#161823;">%s</strong></div>
                  <div>Vị trí: <strong style="color:#161823;">%s</strong></div>
                  <div>Thiết bị: <strong style="color:#161823;">%s</strong></div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 56px 28px;font-size:14px;line-height:1.65;color:#161823;">
                <p style="margin:0 0 14px;"><strong>Chỉ nhập mã này trên ứng dụng hoặc website chính thức của Vibely.</strong> Không chia sẻ mã này với bất kỳ ai.</p>
                <p style="margin:0 0 14px;">Việc chia sẻ mã có thể cho phép người khác truy cập tài khoản Vibely của bạn cùng với thông tin cá nhân và nội dung liên quan.</p>
                <p style="margin:0 0 14px;">Nếu bạn không yêu cầu mã này, có thể có người đang cố truy cập tài khoản của bạn. Hãy đổi mật khẩu ngay trong Vibely.</p>
                <p style="margin:0;">Vì sự an toàn của bạn:<br />• Cẩn thận với đường link hoặc tin nhắn đáng ngờ yêu cầu thông tin đăng nhập.<br />• Liên hệ hỗ trợ Vibely qua %s nếu cần trợ giúp.</p>
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
        return VibelyEmailLayout.document("Mã hủy kích hoạt tài khoản Vibely", bodyRows, username);
    }

    static String accountDeactivationPlainBody(
        String username,
        String code,
        String expiryLabel,
        OtpRequestMetadata metadata
    ) {
        return """
            Mã 6 chữ số Vibely

            Xin chào %s,

            Mã 6 chữ số của bạn là: %s

            Hãy dùng mã này để xác minh rằng @%s là tài khoản Vibely của bạn trước khi hủy kích hoạt.
            Mã này có hiệu lực trong %s.

            Thời gian: %s
            Vị trí: %s
            Thiết bị: %s

            Chỉ nhập mã này trên ứng dụng hoặc website chính thức của Vibely. Không chia sẻ mã này với bất kỳ ai.
            Nếu bạn không yêu cầu mã này, hãy đổi mật khẩu ngay trong Vibely.
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
            .replace("<title>Mã hủy kích hoạt tài khoản Vibely</title>", "<title>Mã kích hoạt lại tài khoản Vibely</title>")
            .replace(
                "Hãy dùng mã này để xác minh rằng <strong>@%s</strong> là tài khoản Vibely của bạn trước khi hủy kích hoạt."
                    .formatted(escapeHtml(username)),
                "Hãy dùng mã này để xác minh rằng <strong>@%s</strong> là tài khoản Vibely của bạn trước khi kích hoạt lại."
                    .formatted(escapeHtml(username))
            )
            .replace(
                "Nếu bạn không yêu cầu mã này, có thể có người đang cố truy cập tài khoản của bạn. Hãy đổi mật khẩu ngay trong Vibely.",
                "Nếu bạn không yêu cầu kích hoạt lại tài khoản, hãy bỏ qua email này và đổi mật khẩu ngay trong Vibely."
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
                "Hãy dùng mã này để xác minh rằng @" + username + " là tài khoản Vibely của bạn trước khi hủy kích hoạt.",
                "Hãy dùng mã này để xác minh rằng @" + username + " là tài khoản Vibely của bạn trước khi kích hoạt lại."
            )
            .replace(
                "Nếu bạn không yêu cầu mã này, hãy đổi mật khẩu ngay trong Vibely.",
                "Nếu bạn không yêu cầu kích hoạt lại tài khoản, hãy bỏ qua email này và đổi mật khẩu ngay trong Vibely."
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
            .replace("<title>Mã hủy kích hoạt tài khoản Vibely</title>", "<title>Mã xóa tài khoản Vibely</title>")
            .replace(
                "Hãy dùng mã này để xác minh rằng <strong>@%s</strong> là tài khoản Vibely của bạn trước khi hủy kích hoạt."
                    .formatted(safeUsername),
                "Hãy dùng mã này để xác minh rằng <strong>@%s</strong> là tài khoản Vibely của bạn trước khi xóa tài khoản vĩnh viễn."
                    .formatted(safeUsername)
            )
            .replace(
                "Nếu bạn không yêu cầu mã này, có thể có người đang cố truy cập tài khoản của bạn. Hãy đổi mật khẩu ngay trong Vibely.",
                "Nếu bạn không yêu cầu xóa tài khoản, có thể có người đang cố truy cập tài khoản của bạn. Hãy đổi mật khẩu ngay trong Vibely."
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
                "Hãy dùng mã này để xác minh rằng @" + username + " là tài khoản Vibely của bạn trước khi hủy kích hoạt.",
                "Hãy dùng mã này để xác minh rằng @" + username + " là tài khoản Vibely của bạn trước khi xóa tài khoản vĩnh viễn."
            )
            .replace(
                "Nếu bạn không yêu cầu mã này, hãy đổi mật khẩu ngay trong Vibely.",
                "Nếu bạn không yêu cầu xóa tài khoản, hãy đổi mật khẩu ngay trong Vibely."
            );
    }

    static String passwordResetHtmlBody(String code, String expiryLabel, String helpUrl) {
        String bodyRows = VibelyEmailLayout.headingRow("Đặt lại mật khẩu") + """
            <tr>
              <td style="padding:0 56px 8px;font-size:15px;line-height:1.7;color:#161823;">
                <p style="margin:0 0 16px;">Nhập mã sau trên Vibely để đặt lại mật khẩu:</p>
                <p style="margin:0 0 16px;text-align:center;font-size:32px;font-weight:800;letter-spacing:4px;color:#161823;">%s</p>
                <p style="margin:0 0 24px;text-align:center;color:#6b7280;">Mã này có hiệu lực trong %s.</p>
                <p style="margin:0;">Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 56px 28px;font-size:14px;line-height:1.65;color:#161823;">
                <p style="margin:0;">Liên hệ hỗ trợ Vibely: %s</p>
              </td>
            </tr>
            """.formatted(code, expiryLabel, VibelyEmailLayout.supportEmailLink());
        return VibelyEmailLayout.document("Đặt lại mật khẩu Vibely", bodyRows, null);
    }

    static String passwordResetPlainBody(String code, String expiryLabel) {
        return """
            Đặt lại mật khẩu Vibely

            Nhập mã sau để đặt lại mật khẩu: %s

            Mã sẽ hết hạn sau %s.

            Nếu bạn không yêu cầu, hãy bỏ qua email này.
            """.formatted(code, expiryLabel).trim();
    }

    static String htmlBody(String code, String expiryLabel, String helpUrl) {
        String bodyRows = VibelyEmailLayout.headingRow("Mã 6 chữ số Vibely") + """
            <tr>
              <td style="padding:0 56px 8px;font-size:15px;line-height:1.7;color:#161823;">
                <p style="margin:0 0 16px;">Để xác minh tài khoản, hãy nhập mã sau trên Vibely:</p>
                <p style="margin:0 0 16px;text-align:center;font-size:32px;font-weight:800;letter-spacing:4px;color:#161823;">%s</p>
                <p style="margin:0 0 24px;text-align:center;color:#6b7280;">Mã này có hiệu lực trong %s.</p>
                <p style="margin:0;">Nếu bạn không yêu cầu mã này, có thể bỏ qua email này.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 56px 28px;font-size:14px;line-height:1.65;color:#161823;">
                <p style="margin:0 0 8px;">Đội ngũ hỗ trợ Vibely · %s</p>
                <p style="margin:0;">Có thắc mắc? Liên hệ qua email hỗ trợ hoặc báo cáo trong ứng dụng tại <strong>Cài đặt &gt; Báo cáo sự cố</strong>.</p>
              </td>
            </tr>
            """.formatted(code, expiryLabel, VibelyEmailLayout.supportEmailLink());
        return VibelyEmailLayout.document("Mã xác minh Vibely", bodyRows, null);
    }

    static String plainBody(String code, String expiryLabel) {
        return """
            Mã xác minh Vibely

            Để xác minh tài khoản, hãy nhập mã sau trên Vibely: %s

            Mã sẽ hết hạn sau %s.

            Nếu bạn không yêu cầu mã này, hãy bỏ qua email này.
            """.formatted(code, expiryLabel).trim();
    }

    static String formatExpiryLabel(int expirySeconds) {
        if (expirySeconds >= 3600 && expirySeconds % 3600 == 0) {
            int hours = expirySeconds / 3600;
            return hours + " giờ";
        }
        int minutes = Math.max(1, (int) Math.ceil(expirySeconds / 60.0));
        return minutes + " phút";
    }

    private static String escapeHtml(String raw) {
        if (raw == null || raw.isBlank()) {
            return "người dùng Vibely";
        }
        return raw.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;")
            .replace("'", "&#39;");
    }
}
