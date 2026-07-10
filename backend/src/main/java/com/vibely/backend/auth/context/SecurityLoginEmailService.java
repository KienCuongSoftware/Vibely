package com.vibely.backend.auth.context;

import com.vibely.backend.auth.mail.OtpMailProperties;
import com.vibely.backend.auth.mail.VibelyEmailLayout;
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
        String bodyRows = VibelyEmailLayout.headingRow("Phát hiện đăng nhập mới") + """
            <tr>
              <td style="padding:0 56px 8px;font-size:15px;line-height:1.7;color:#161823;">
                <p style="margin:0 0 18px;">Xin chào <strong>%s</strong>, chúng tôi phát hiện một lần đăng nhập có dấu hiệu mới: <strong>%s</strong>.</p>
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
                <p style="margin:0 0 16px;">Nếu đây là bạn, bạn có thể bỏ qua email này. Nếu không phải bạn, hãy đổi mật khẩu ngay và kiểm tra hoạt động tài khoản.</p>
                <p style="margin:0 0 8px;"><a href="%s/settings" style="color:#2563eb;text-decoration:none;">Mở cài đặt bảo mật Vibely</a></p>
                <p style="margin:0;">Liên hệ hỗ trợ: %s</p>
              </td>
            </tr>
            """.formatted(
                escape(user.getUsername()),
                reasons,
                time,
                location,
                device,
                frontendBaseUrl,
                VibelyEmailLayout.supportEmailLink()
            );
        return VibelyEmailLayout.document("Cảnh báo đăng nhập Vibely", bodyRows, user.getUsername());
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
