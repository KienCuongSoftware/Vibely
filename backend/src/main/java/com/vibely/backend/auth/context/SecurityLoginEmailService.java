package com.vibely.backend.auth.context;

import com.vibely.backend.auth.mail.OtpMailProperties;
import com.vibely.backend.user.entity.User;
import jakarta.mail.internet.MimeMessage;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
@SuppressWarnings("null")
public class SecurityLoginEmailService {

    private static final Logger log = LoggerFactory.getLogger(SecurityLoginEmailService.class);
    private static final DateTimeFormatter TIME_FORMATTER =
        DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm 'UTC'", Locale.forLanguageTag("vi-VN"));

    private final OtpMailProperties mailProperties;
    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final String frontendBaseUrl;
    private final String smtpUsername;

    public SecurityLoginEmailService(
        OtpMailProperties mailProperties,
        ObjectProvider<JavaMailSender> mailSenderProvider,
        @Value("${app.urls.frontend-base-url:http://localhost:5173}") String frontendBaseUrl,
        @Value("${spring.mail.username:}") String smtpUsername
    ) {
        this.mailProperties = mailProperties;
        this.mailSenderProvider = mailSenderProvider;
        this.frontendBaseUrl = frontendBaseUrl;
        this.smtpUsername = smtpUsername;
    }

    public void sendSuspiciousLoginAlert(User user, LoginContext context, LoginRiskResult risk) {
        if (!mailProperties.isEnabled()) {
            return;
        }
        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            return;
        }
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
            helper.setFrom(resolveFromAddress(), mailProperties.getFromName());
            helper.setTo(user.getEmail());
            helper.setSubject("Cảnh báo đăng nhập Vibely");
            helper.setText(plainBody(context, risk), htmlBody(user, context, risk));
            mailSender.send(message);
        } catch (Exception ex) {
            log.warn("Failed to send suspicious login alert to userId={}", user.getId(), ex);
        }
    }

    private String htmlBody(User user, LoginContext context, LoginRiskResult risk) {
        String time = TIME_FORMATTER.format(LocalDateTime.now().atOffset(ZoneOffset.UTC));
        String device = escape(context.getBrowser() + " trên " + context.getOperatingSystem());
        String location = escape(displayLocation(context)).replace("\n", "<br />");
        String reasons = escape(String.join(", ", risk.reasons()));
        return """
            <!DOCTYPE html>
            <html lang="vi">
            <body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#161823;">
              <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="padding:28px 16px;background:#f5f5f5;">
                <tr><td align="center">
                  <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#fff;border-radius:12px;padding:28px;">
                    <tr><td style="font-size:28px;font-weight:900;text-align:center;padding-bottom:16px;">Vibely</td></tr>
                    <tr><td style="font-size:22px;font-weight:800;padding-bottom:10px;">Phát hiện đăng nhập mới</td></tr>
                    <tr><td style="font-size:14px;line-height:1.6;color:#444;padding-bottom:18px;">Xin chào <strong>%s</strong>, chúng tôi phát hiện một lần đăng nhập có dấu hiệu mới: <strong>%s</strong>.</td></tr>
                    <tr><td>
                      <div style="background:#f7f7f8;border-radius:10px;padding:18px 20px;font-size:14px;line-height:1.8;color:#4b5563;">
                        <div>Thời gian:<br /><strong style="color:#161823;">%s</strong></div>
                        <div style="margin-top:10px;">Thiết bị:<br /><strong style="color:#161823;">%s</strong></div>
                        <div style="margin-top:10px;">Vị trí:<br /><strong style="color:#161823;">%s</strong></div>
                      </div>
                    </td></tr>
                    <tr><td style="font-size:14px;line-height:1.6;color:#444;padding-top:18px;">Nếu đây là bạn, bạn có thể bỏ qua email này. Nếu không phải bạn, hãy đổi mật khẩu ngay và kiểm tra hoạt động tài khoản.</td></tr>
                    <tr><td style="padding-top:16px;"><a href="%s/settings" style="color:#fe2c55;text-decoration:none;font-weight:700;">Mở cài đặt bảo mật Vibely</a></td></tr>
                  </table>
                </td></tr>
              </table>
            </body>
            </html>
            """.formatted(
                escape(user.getUsername()),
                reasons,
                time,
                device,
                location,
                frontendBaseUrl
            );
    }

    private String plainBody(LoginContext context, LoginRiskResult risk) {
        return """
            Phát hiện đăng nhập mới trên Vibely

            Lý do: %s
            Thời gian: %s
            Thiết bị: %s trên %s
            Vị trí:
            %s

            Nếu đây không phải bạn, hãy đổi mật khẩu ngay.
            """.formatted(
                String.join(", ", risk.reasons()),
                TIME_FORMATTER.format(LocalDateTime.now().atOffset(ZoneOffset.UTC)),
                context.getBrowser(),
                context.getOperatingSystem(),
                displayLocation(context)
            ).trim();
    }

    private String displayLocation(LoginContext context) {
        StringBuilder builder = new StringBuilder();
        append(builder, context.getWard());
        append(builder, context.getDistrict());
        append(builder, context.getCity());
        append(builder, context.getProvince());
        append(builder, context.getCountry());
        return builder.isEmpty() ? "Không xác định" : builder.toString();
    }

    private void append(StringBuilder builder, String value) {
        if (value == null || value.isBlank() || "Không xác định".equals(value)) {
            return;
        }
        if (builder.indexOf(value) >= 0) {
            return;
        }
        if (!builder.isEmpty()) {
            builder.append("\n");
        }
        builder.append(value);
    }

    private String resolveFromAddress() {
        if (mailProperties.getFrom() != null && !mailProperties.getFrom().isBlank()) {
            return mailProperties.getFrom().trim();
        }
        if (smtpUsername != null && !smtpUsername.isBlank()) {
            return smtpUsername.trim();
        }
        return "noreply@vibely.app";
    }

    private String escape(String raw) {
        if (raw == null || raw.isBlank()) {
            return "Không xác định";
        }
        return raw.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;")
            .replace("'", "&#39;");
    }
}
