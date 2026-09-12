package com.vibely.backend.auth.context;

import com.vibely.backend.auth.mail.EmailLocale;
import com.vibely.backend.auth.mail.EmailLocales;
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
    private static final DateTimeFormatter EN_TIME =
        DateTimeFormatter.ofPattern("dd MMM yyyy HH:mm 'UTC'", Locale.ENGLISH);
    private static final DateTimeFormatter VI_TIME =
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
            helper.setSubject(EmailLocales.pick(locale(user), "Vibely login alert", "Cảnh báo đăng nhập Vibely"));
            helper.setText(plainBody(user, context, risk), htmlBody(user, context, risk));
            mailSender.send(message);
        } catch (Exception ex) {
            log.warn("Failed to send suspicious login alert to userId={}", user.getId(), ex);
        }
    }

    private String htmlBody(User user, LoginContext context, LoginRiskResult risk) {
        EmailLocale locale = locale(user);
        String time = formatTime(locale);
        String device = escape(context.getBrowser() + " on " + context.getOperatingSystem());
        String location = escape(displayLocation(context, locale)).replace("\n", "<br />");
        String reasons = escape(String.join(", ", risk.reasons()));
        String bodyRows = VibelyEmailLayout.headingRow(
            EmailLocales.pick(locale, "New login detected", "Phát hiện đăng nhập mới")
        ) + """
            <tr>
              <td style="padding:0 56px 8px;font-size:15px;line-height:1.7;color:#161823;">
                <p style="margin:0 0 18px;">%s <strong>%s</strong>, %s <strong>%s</strong>.</p>
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
                <p style="margin:0 0 16px;">%s</p>
                <p style="margin:0 0 8px;"><a href="%s/settings" style="color:#2563eb;text-decoration:none;">%s</a></p>
                <p style="margin:0;">%s %s</p>
              </td>
            </tr>
            """.formatted(
                EmailLocales.pick(locale, "Hello", "Xin chào"),
                escape(user.getUsername()),
                EmailLocales.pick(locale, "we detected a login with new signals:", "chúng tôi phát hiện đăng nhập với tín hiệu mới:"),
                reasons,
                EmailLocales.pick(locale, "Time", "Thời gian"),
                time,
                EmailLocales.pick(locale, "Location", "Vị trí"),
                location,
                EmailLocales.pick(locale, "Device", "Thiết bị"),
                device,
                EmailLocales.pick(
                    locale,
                    "If this was you, you can ignore this email. If it was not you, change your password immediately and review account activity.",
                    "Nếu đây là bạn, hãy bỏ qua email này. Nếu không phải bạn, hãy đổi mật khẩu ngay và kiểm tra hoạt động tài khoản."
                ),
                frontendBaseUrl,
                EmailLocales.pick(locale, "Open Vibely security settings", "Mở cài đặt bảo mật Vibely"),
                EmailLocales.pick(locale, "Contact support:", "Liên hệ hỗ trợ:"),
                VibelyEmailLayout.supportEmailLink()
            );
        return VibelyEmailLayout.document(
            EmailLocales.pick(locale, "Vibely login alert", "Cảnh báo đăng nhập Vibely"),
            bodyRows,
            user.getUsername(),
            locale
        );
    }

    private String plainBody(User user, LoginContext context, LoginRiskResult risk) {
        EmailLocale locale = locale(user);
        return """
            %s

            %s %s
            %s: %s
            %s: %s on %s
            %s:
            %s

            %s
            """.formatted(
                EmailLocales.pick(locale, "New login detected on Vibely", "Phát hiện đăng nhập mới trên Vibely"),
                EmailLocales.pick(locale, "Reason:", "Lý do:"),
                String.join(", ", risk.reasons()),
                EmailLocales.pick(locale, "Time", "Thời gian"),
                formatTime(locale),
                EmailLocales.pick(locale, "Device", "Thiết bị"),
                context.getBrowser(),
                context.getOperatingSystem(),
                EmailLocales.pick(locale, "Location", "Vị trí"),
                displayLocation(context, locale),
                EmailLocales.pick(
                    locale,
                    "If this was not you, change your password immediately.",
                    "Nếu không phải bạn, hãy đổi mật khẩu ngay."
                )
            ).trim();
    }

    private String displayLocation(LoginContext context, EmailLocale locale) {
        StringBuilder builder = new StringBuilder();
        append(builder, context.getWard());
        append(builder, context.getDistrict());
        append(builder, context.getCity());
        append(builder, context.getProvince());
        append(builder, context.getCountry());
        return builder.isEmpty()
            ? EmailLocales.pick(locale, "Unknown", "Không xác định")
            : builder.toString();
    }

    private void append(StringBuilder builder, String value) {
        if (value == null || value.isBlank()
            || "Unknown".equals(value)
            || "Không xác định".equals(value)) {
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

    private EmailLocale locale(User user) {
        return EmailLocales.resolve(user == null ? null : user.getPreferredLocale());
    }

    private String formatTime(EmailLocale locale) {
        var now = LocalDateTime.now().atOffset(ZoneOffset.UTC);
        return (locale != null && locale.vietnamese() ? VI_TIME : EN_TIME).format(now);
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
            return "Unknown";
        }
        return raw.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;")
            .replace("'", "&#39;");
    }
}
