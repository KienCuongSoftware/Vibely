package com.vibely.backend.admin;

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
            "Tài khoản Vibely của bạn đã bị cấm",
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
            "Tài khoản Vibely của bạn đã được mở khóa",
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
        return """
            Xin chào %s,

            Tài khoản Vibely @%s của bạn đã bị cấm bởi quản trị viên.

            Lý do:
            %s

            Bạn sẽ không thể đăng nhập hoặc sử dụng Vibely cho đến khi tài khoản được gỡ cấm.

            Nếu bạn cho rằng đây là nhầm lẫn, bạn có thể gửi khiếu nại tới %s.

            Vibely
            """.formatted(displayName(user), user.username(), reasonText(user), VibelyEmailLayout.SUPPORT_EMAIL);
    }

    private String htmlBanBody(AdminBannedUserInfo user) {
        String bodyRows = VibelyEmailLayout.headingRow("Tài khoản của bạn đã bị cấm") + """
            <tr>
              <td style="padding:0 56px 28px;font-size:15px;line-height:1.7;color:#161823;">
                <p style="margin:0 0 16px;">Xin chào <strong>%s</strong>,</p>
                <p style="margin:0 0 16px;">Tài khoản Vibely <strong>@%s</strong> của bạn đã bị cấm bởi quản trị viên.</p>
                <p style="margin:0 0 8px;"><strong>Lý do:</strong></p>
                <p style="margin:0 0 18px;white-space:pre-wrap;background:#f7f7f8;border-radius:10px;padding:16px 18px;color:#4b5563;">%s</p>
                <p style="margin:0 0 16px;">Bạn sẽ không thể đăng nhập hoặc sử dụng Vibely cho đến khi tài khoản được gỡ cấm.</p>
                <p style="margin:0;">Nếu bạn cho rằng đây là nhầm lẫn, bạn có thể gửi khiếu nại tới %s.</p>
              </td>
            </tr>
            """.formatted(
            VibelyEmailLayout.escapeHtml(displayName(user)),
            VibelyEmailLayout.escapeHtml(user.username()),
            VibelyEmailLayout.escapeHtml(reasonText(user)),
            VibelyEmailLayout.supportEmailLink()
        );
        return VibelyEmailLayout.document("Tài khoản Vibely của bạn đã bị cấm", bodyRows, user.username());
    }

    private String plainUnbanBody(AdminUnbannedUserInfo user) {
        return """
            Xin chào %s,

            Tài khoản Vibely @%s của bạn đã được mở khóa bởi quản trị viên.

            Bạn có thể đăng nhập và sử dụng Vibely bình thường.

            Nếu bạn có thắc mắc, vui lòng liên hệ %s.

            Vibely
            """.formatted(
            displayName(user),
            user.username(),
            VibelyEmailLayout.SUPPORT_EMAIL
        );
    }

    private String htmlUnbanBody(AdminUnbannedUserInfo user) {
        String bodyRows = VibelyEmailLayout.headingRow("Tài khoản của bạn đã được mở khóa") + """
            <tr>
              <td style="padding:0 56px 28px;font-size:15px;line-height:1.7;color:#161823;">
                <p style="margin:0 0 16px;">Xin chào <strong>%s</strong>,</p>
                <p style="margin:0 0 16px;">Tài khoản Vibely <strong>@%s</strong> của bạn đã được mở khóa bởi quản trị viên.</p>
                <p style="margin:0 0 16px;">Bạn có thể đăng nhập và sử dụng Vibely bình thường.</p>
                <p style="margin:0;">Nếu bạn có thắc mắc, vui lòng liên hệ %s.</p>
              </td>
            </tr>
            """.formatted(
            VibelyEmailLayout.escapeHtml(displayName(user)),
            VibelyEmailLayout.escapeHtml(user.username()),
            VibelyEmailLayout.supportEmailLink()
        );
        return VibelyEmailLayout.document("Tài khoản Vibely của bạn đã được mở khóa", bodyRows, user.username());
    }

    private String displayName(AdminBannedUserInfo user) {
        return StringUtils.hasText(user.displayName()) ? user.displayName().trim() : "bạn";
    }

    private String displayName(AdminUnbannedUserInfo user) {
        return StringUtils.hasText(user.displayName()) ? user.displayName().trim() : "bạn";
    }

    private String reasonText(AdminBannedUserInfo user) {
        return StringUtils.hasText(user.banReason()) ? user.banReason().trim() : "Không có lý do cụ thể";
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
