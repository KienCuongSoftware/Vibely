package com.vibely.backend.auth.mail;

final class OtpVerificationEmailTemplate {

    private OtpVerificationEmailTemplate() {
    }

    static String subject(String code) {
        return code + " là mã xác minh của bạn";
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
}
