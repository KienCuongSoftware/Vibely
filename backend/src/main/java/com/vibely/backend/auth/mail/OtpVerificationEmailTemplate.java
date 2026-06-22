package com.vibely.backend.auth.mail;

import com.vibely.backend.auth.OtpRequestMetadata;
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
        return """
            <!DOCTYPE html>
            <html lang="vi">
            <head>
              <meta charset="UTF-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <title>Mã hủy kích hoạt tài khoản Vibely</title>
            </head>
            <body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#161823;">
              <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="background:#ffffff;padding:24px 16px;">
                <tr>
                  <td align="center">
                    <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;">
                      <tr>
                        <td style="padding:0 0 24px;">
                          <table role="presentation" width="100%%" cellspacing="0" cellpadding="0">
                            <tr>
                              <td style="height:8px;background:#fe2c55;width:30%%;"></td>
                              <td style="height:8px;background:#25f4ee;width:22%%;"></td>
                              <td style="height:8px;background:#111827;width:18%%;"></td>
                              <td style="height:8px;background:#7c3aed;width:14%%;"></td>
                              <td style="height:8px;background:#fe2c55;width:16%%;"></td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding:10px 28px 8px;">
                          <div style="font-size:34px;font-weight:900;letter-spacing:-1px;color:#161823;">Vibely</div>
                          <h1 style="margin:18px 0 14px;font-size:28px;line-height:1.25;font-weight:800;color:#161823;">Mã 6 chữ số Vibely</h1>
                        </td>
                      </tr>
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
                          <p style="margin:0;">Vì sự an toàn của bạn:<br />• Cẩn thận với đường link hoặc tin nhắn đáng ngờ yêu cầu thông tin đăng nhập.<br />• <a href="%s" style="color:#2563eb;text-decoration:none;">Xem các bước bảo vệ tài khoản của bạn</a></p>
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding:8px 28px 28px;color:#a1a1aa;font-size:12px;line-height:1.6;">
                          <div style="font-size:18px;font-weight:800;color:#b4b4bb;margin-bottom:8px;">Vibely</div>
                          <div>Email này được tạo cho @%s.</div>
                          <div>Đây là email tự động, vui lòng không trả lời.</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """.formatted(
                safeUsername,
                code,
                safeUsername,
                expiryLabel,
                generatedAt,
                location,
                browser,
                helpUrl,
                safeUsername
            );
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

    static String passwordResetHtmlBody(String code, String expiryLabel, String helpUrl) {
        return """
            <!DOCTYPE html>
            <html lang="vi">
            <head>
              <meta charset="UTF-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <title>Đặt lại mật khẩu Vibely</title>
            </head>
            <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#161823;">
              <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:32px 16px;">
                <tr>
                  <td align="center">
                    <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="max-width:480px;background:#ffffff;border-radius:8px;overflow:hidden;">
                      <tr>
                        <td style="padding:28px 28px 8px;text-align:center;">
                          <div style="font-size:28px;font-weight:800;letter-spacing:-0.5px;color:#161823;">Vibely</div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 24px 24px;">
                          <div style="background:#f1f1f2;border-radius:8px;padding:24px 20px;text-align:center;">
                            <p style="margin:0 0 12px;font-size:18px;font-weight:700;color:#161823;">Đặt lại mật khẩu</p>
                            <p style="margin:0 0 20px;font-size:14px;line-height:1.5;color:#545454;">
                              Nhập mã sau trên Vibely để đặt lại mật khẩu:
                            </p>
                            <p style="margin:0;font-size:40px;font-weight:800;letter-spacing:6px;color:#161823;">%s</p>
                            <p style="margin:20px 0 0;font-size:13px;line-height:1.5;color:#545454;">
                              Mã sẽ hết hạn sau %s.
                            </p>
                            <p style="margin:12px 0 0;font-size:13px;line-height:1.5;color:#545454;">
                              Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.
                            </p>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 28px 28px;font-size:13px;line-height:1.6;color:#545454;">
                          <p style="margin:0 0 8px;">
                            <a href="%s" style="color:#fe2c55;text-decoration:none;">Trung tâm trợ giúp</a>
                          </p>
                          <p style="margin:0;color:#8a8b91;font-size:12px;">
                            Đây là email được tạo tự động. Không trả lời email này.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """.formatted(code, expiryLabel, helpUrl);
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
        return """
            <!DOCTYPE html>
            <html lang="vi">
            <head>
              <meta charset="UTF-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <title>Mã xác minh Vibely</title>
            </head>
            <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#161823;">
              <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:32px 16px;">
                <tr>
                  <td align="center">
                    <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="max-width:480px;background:#ffffff;border-radius:8px;overflow:hidden;">
                      <tr>
                        <td style="padding:28px 28px 8px;text-align:center;">
                          <div style="font-size:28px;font-weight:800;letter-spacing:-0.5px;color:#161823;">Vibely</div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 24px 24px;">
                          <div style="background:#f1f1f2;border-radius:8px;padding:24px 20px;text-align:center;">
                            <p style="margin:0 0 12px;font-size:18px;font-weight:700;color:#161823;">Mã xác minh</p>
                            <p style="margin:0 0 20px;font-size:14px;line-height:1.5;color:#545454;">
                              Để xác minh tài khoản, hãy nhập mã này trên Vibely:
                            </p>
                            <p style="margin:0;font-size:40px;font-weight:800;letter-spacing:6px;color:#161823;">%s</p>
                            <p style="margin:20px 0 0;font-size:13px;line-height:1.5;color:#545454;">
                              Mã xác minh sẽ hết hạn sau %s.
                            </p>
                            <p style="margin:12px 0 0;font-size:13px;line-height:1.5;color:#545454;">
                              Nếu bạn không yêu cầu mã này, có thể bỏ qua email này.
                            </p>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 28px 28px;font-size:13px;line-height:1.6;color:#545454;">
                          <p style="margin:0 0 8px;">
                            Đội ngũ hỗ trợ Vibely ·
                            <a href="%s" style="color:#fe2c55;text-decoration:none;">Trung tâm trợ giúp</a>
                          </p>
                          <p style="margin:0 0 8px;">
                            Có thắc mắc? Xem trung tâm trợ giúp hoặc báo cáo trong ứng dụng tại
                            <strong>Cài đặt &gt; Báo cáo sự cố</strong>.
                          </p>
                          <p style="margin:0;color:#8a8b91;font-size:12px;">
                            Đây là email được tạo tự động. Không trả lời email này.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """.formatted(code, expiryLabel, helpUrl);
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
