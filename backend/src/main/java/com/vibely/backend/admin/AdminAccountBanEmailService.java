package com.vibely.backend.admin;

import com.vibely.backend.auth.mail.EmailLocale;
import com.vibely.backend.auth.mail.EmailLocales;
import com.vibely.backend.auth.mail.OtpMailProperties;
import com.vibely.backend.auth.mail.VibelyEmailLayout;
import jakarta.mail.internet.MimeMessage;
import java.nio.charset.StandardCharsets;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class AdminAccountBanEmailService {

    private static final Logger log = LoggerFactory.getLogger(AdminAccountBanEmailService.class);

    private final OtpMailProperties mailProperties;
    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final String smtpUsername;

    public AdminAccountBanEmailService(
        OtpMailProperties mailProperties,
        ObjectProvider<JavaMailSender> mailSenderProvider,
        @Value("${spring.mail.username:}") String smtpUsername
    ) {
        this.mailProperties = mailProperties;
        this.mailSenderProvider = mailSenderProvider;
        this.smtpUsername = smtpUsername;
    }

    public void sendAccountBanned(AdminBannedUserInfo bannedUser) {
        if (bannedUser == null) {
            return;
        }
        sendAdminAccountEmail(
            bannedUser.email(),
            EmailLocales.pick(locale(bannedUser.preferredLocale()), "Your Vibely account has been banned", "Tài khoản Vibely của bạn đã bị cấm"),
            plainBanBody(bannedUser),
            htmlBanBody(bannedUser),
            "Admin account ban email"
        );
    }

    public void sendAccountUnbanned(AdminUnbannedUserInfo unbannedUser) {
        if (unbannedUser == null) {
            return;
        }
        sendAdminAccountEmail(
            unbannedUser.email(),
            EmailLocales.pick(locale(unbannedUser.preferredLocale()), "Your Vibely account has been unlocked", "Tài khoản Vibely của bạn đã được mở khóa"),
            plainUnbanBody(unbannedUser),
            htmlUnbanBody(unbannedUser),
            "Admin account unban email"
        );
    }

    private void sendAdminAccountEmail(
        String recipientEmail,
        String subject,
        String plainText,
        String htmlText,
        String logLabel
    ) {
        if (!StringUtils.hasText(recipientEmail)) {
            return;
        }
        if (!mailProperties.isEnabled()) {
            log.info("{} skipped (app.mail.enabled=false). recipient={}", logLabel, maskEmail(recipientEmail));
            return;
        }

        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            log.warn("{} skipped: JavaMailSender not configured", logLabel);
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
            helper.setFrom(resolveFromAddress(), mailProperties.getFromName());
            helper.setTo(recipientEmail);
            helper.setSubject(subject);
            helper.setText(plainText, htmlText);
            mailSender.send(message);
            log.info("{} sent to {}", logLabel, maskEmail(recipientEmail));
        } catch (Exception ex) {
            log.warn("Failed to send {} to {}", logLabel, maskEmail(recipientEmail), ex);
        }
    }

    private String plainBanBody(AdminBannedUserInfo user) {
        EmailLocale locale = locale(user.preferredLocale());
        return """
            %s %s,

            %s @%s %s

            %s:
            %s

            %s

            %s %s.

            Vibely
            """.formatted(
            EmailLocales.pick(locale, "Hello", "Xin chào"),
            displayName(user, locale),
            EmailLocales.pick(locale, "Your Vibely account", "Tài khoản Vibely"),
            user.username(),
            EmailLocales.pick(locale, "has been banned.", "đã bị cấm."),
            EmailLocales.pick(locale, "Reason", "Lý do"),
            reasonText(user, locale),
            EmailLocales.pick(
                locale,
                "You will not be able to log in or use Vibely until the account is unbanned.",
                "Bạn sẽ không thể đăng nhập hoặc dùng Vibely cho đến khi tài khoản được mở khóa."
            ),
            EmailLocales.pick(
                locale,
                "If you believe this is a mistake, you can submit an appeal to",
                "Nếu bạn cho rằng đây là nhầm lẫn, hãy gửi khiếu nại tới"
            ),
            VibelyEmailLayout.SUPPORT_EMAIL
        );
    }

    private String htmlBanBody(AdminBannedUserInfo user) {
        EmailLocale locale = locale(user.preferredLocale());
        String bodyRows = VibelyEmailLayout.headingRow(
            EmailLocales.pick(locale, "Your account has been banned", "Tài khoản của bạn đã bị cấm")
        ) + """
            <tr>
              <td style="padding:0 56px 28px;font-size:15px;line-height:1.7;color:#161823;">
                <p style="margin:0 0 16px;">%s <strong>%s</strong>,</p>
                <p style="margin:0 0 16px;">%s <strong>@%s</strong> %s</p>
                <p style="margin:0 0 8px;"><strong>%s:</strong></p>
                <p style="margin:0 0 18px;white-space:pre-wrap;background:#f7f7f8;border-radius:10px;padding:16px 18px;color:#4b5563;">%s</p>
                <p style="margin:0 0 16px;">%s</p>
                <p style="margin:0;">%s %s.</p>
              </td>
            </tr>
            """.formatted(
            EmailLocales.pick(locale, "Hello", "Xin chào"),
            VibelyEmailLayout.escapeHtml(displayName(user, locale)),
            EmailLocales.pick(locale, "Your Vibely account", "Tài khoản Vibely"),
            VibelyEmailLayout.escapeHtml(user.username()),
            EmailLocales.pick(locale, "has been banned.", "đã bị cấm."),
            EmailLocales.pick(locale, "Reason", "Lý do"),
            VibelyEmailLayout.escapeHtml(reasonText(user, locale)),
            EmailLocales.pick(
                locale,
                "You will not be able to log in or use Vibely until the account is unbanned.",
                "Bạn sẽ không thể đăng nhập hoặc dùng Vibely cho đến khi tài khoản được mở khóa."
            ),
            EmailLocales.pick(
                locale,
                "If you believe this is a mistake, you can submit an appeal to",
                "Nếu bạn cho rằng đây là nhầm lẫn, hãy gửi khiếu nại tới"
            ),
            VibelyEmailLayout.supportEmailLink()
        );
        return VibelyEmailLayout.document(
            EmailLocales.pick(locale, "Your Vibely account has been banned", "Tài khoản Vibely của bạn đã bị cấm"),
            bodyRows,
            user.username(),
            locale
        );
    }

    private String plainUnbanBody(AdminUnbannedUserInfo user) {
        EmailLocale locale = locale(user.preferredLocale());
        return """
            %s %s,

            %s @%s %s

            %s

            %s %s.

            Vibely
            """.formatted(
            EmailLocales.pick(locale, "Hello", "Xin chào"),
            displayName(user, locale),
            EmailLocales.pick(locale, "Your Vibely account", "Tài khoản Vibely"),
            user.username(),
            EmailLocales.pick(locale, "has been unlocked by an administrator.", "đã được quản trị viên mở khóa."),
            EmailLocales.pick(locale, "You can log in and use Vibely as usual.", "Bạn có thể đăng nhập và dùng Vibely như bình thường."),
            EmailLocales.pick(locale, "If you have questions, please contact", "Nếu có thắc mắc, hãy liên hệ"),
            VibelyEmailLayout.SUPPORT_EMAIL
        );
    }

    private String htmlUnbanBody(AdminUnbannedUserInfo user) {
        EmailLocale locale = locale(user.preferredLocale());
        String bodyRows = VibelyEmailLayout.headingRow(
            EmailLocales.pick(locale, "Your account has been unlocked", "Tài khoản của bạn đã được mở khóa")
        ) + """
            <tr>
              <td style="padding:0 56px 28px;font-size:15px;line-height:1.7;color:#161823;">
                <p style="margin:0 0 16px;">%s <strong>%s</strong>,</p>
                <p style="margin:0 0 16px;">%s <strong>@%s</strong> %s</p>
                <p style="margin:0 0 16px;">%s</p>
                <p style="margin:0;">%s %s.</p>
              </td>
            </tr>
            """.formatted(
            EmailLocales.pick(locale, "Hello", "Xin chào"),
            VibelyEmailLayout.escapeHtml(displayName(user, locale)),
            EmailLocales.pick(locale, "Your Vibely account", "Tài khoản Vibely"),
            VibelyEmailLayout.escapeHtml(user.username()),
            EmailLocales.pick(locale, "has been unlocked by an administrator.", "đã được quản trị viên mở khóa."),
            EmailLocales.pick(locale, "You can log in and use Vibely as usual.", "Bạn có thể đăng nhập và dùng Vibely như bình thường."),
            EmailLocales.pick(locale, "If you have questions, please contact", "Nếu có thắc mắc, hãy liên hệ"),
            VibelyEmailLayout.supportEmailLink()
        );
        return VibelyEmailLayout.document(
            EmailLocales.pick(locale, "Your Vibely account has been unlocked", "Tài khoản Vibely của bạn đã được mở khóa"),
            bodyRows,
            user.username(),
            locale
        );
    }

    private String displayName(AdminBannedUserInfo user, EmailLocale locale) {
        return StringUtils.hasText(user.displayName())
            ? user.displayName().trim()
            : EmailLocales.pick(locale, "you", "bạn");
    }

    private String displayName(AdminUnbannedUserInfo user, EmailLocale locale) {
        return StringUtils.hasText(user.displayName())
            ? user.displayName().trim()
            : EmailLocales.pick(locale, "you", "bạn");
    }

    private String reasonText(AdminBannedUserInfo user, EmailLocale locale) {
        String raw = user == null ? null : user.banReason();
        String cleaned = com.vibely.backend.moderation.BanReasonFormatter.forDisplay(raw);
        return StringUtils.hasText(cleaned)
            ? cleaned
            : EmailLocales.pick(locale, "No specific reason", "Không có lý do cụ thể");
    }

    private EmailLocale locale(String preferredLocale) {
        return EmailLocales.resolve(preferredLocale);
    }

    private String resolveFromAddress() {
        if (StringUtils.hasText(mailProperties.getFrom())) {
            return mailProperties.getFrom().trim();
        }
        if (StringUtils.hasText(smtpUsername)) {
            return smtpUsername.trim();
        }
        return "noreply@vibely.app";
    }

    private String escapeHtml(String value) {
        return VibelyEmailLayout.escapeHtml(value);
    }

    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) {
            return "***";
        }
        int at = email.indexOf('@');
        String local = email.substring(0, at);
        String domain = email.substring(at);
        if (local.length() <= 2) {
            return "**" + domain;
        }
        return local.substring(0, 2) + "***" + domain;
    }
}
