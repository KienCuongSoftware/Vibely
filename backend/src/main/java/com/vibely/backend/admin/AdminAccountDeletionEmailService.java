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
public class AdminAccountDeletionEmailService {

    private static final Logger log = LoggerFactory.getLogger(AdminAccountDeletionEmailService.class);

    private final OtpMailProperties mailProperties;
    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final String smtpUsername;

    public AdminAccountDeletionEmailService(
        OtpMailProperties mailProperties,
        ObjectProvider<JavaMailSender> mailSenderProvider,
        @Value("${spring.mail.username:}") String smtpUsername
    ) {
        this.mailProperties = mailProperties;
        this.mailSenderProvider = mailSenderProvider;
        this.smtpUsername = smtpUsername;
    }

    public void sendAccountDeleted(AdminDeletedUserInfo deletedUser) {
        if (deletedUser == null || !StringUtils.hasText(deletedUser.email())) {
            return;
        }
        if (!mailProperties.isEnabled()) {
            log.info("Admin account deletion email skipped (app.mail.enabled=false). recipient={}", maskEmail(deletedUser.email()));
            return;
        }

        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            log.warn("Admin account deletion email skipped: JavaMailSender not configured");
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
            helper.setFrom(resolveFromAddress(), mailProperties.getFromName());
            helper.setTo(deletedUser.email());
            helper.setSubject("Tài khoản Vibely của bạn đã bị xóa");
            helper.setText(plainBody(deletedUser), htmlBody(deletedUser));
            mailSender.send(message);
            log.info("Admin account deletion email sent to {}", maskEmail(deletedUser.email()));
        } catch (Exception ex) {
            log.warn("Failed to send admin account deletion email to {}", maskEmail(deletedUser.email()), ex);
        }
    }

    public void sendAccountUpdated(AdminUpdatedUserInfo updatedUser) {
        if (updatedUser == null || !updatedUser.hasNotifiableChanges() || !StringUtils.hasText(updatedUser.email())) {
            return;
        }
        if (!mailProperties.isEnabled()) {
            log.info("Admin account update email skipped (app.mail.enabled=false). recipient={}", maskEmail(updatedUser.email()));
            return;
        }

        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            log.warn("Admin account update email skipped: JavaMailSender not configured");
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
            helper.setFrom(resolveFromAddress(), mailProperties.getFromName());
            helper.setTo(updatedUser.email());
            helper.setSubject("Thông tin tài khoản Vibely của bạn đã được cập nhật");
            helper.setText(updatePlainBody(updatedUser), updateHtmlBody(updatedUser));
            mailSender.send(message);
            log.info("Admin account update email sent to {}", maskEmail(updatedUser.email()));
        } catch (Exception ex) {
            log.warn("Failed to send admin account update email to {}", maskEmail(updatedUser.email()), ex);
        }
    }

    private String plainBody(AdminDeletedUserInfo user) {
        return """
            Xin chào %s,

            Tài khoản Vibely @%s của bạn đã bị xóa bởi quản trị viên.
            Toàn bộ dữ liệu liên quan đến tài khoản có thể không còn truy cập được trên Vibely.

            Nếu bạn cho rằng đây là nhầm lẫn, vui lòng liên hệ đội ngũ hỗ trợ Vibely qua %s.

            Vibely
            """.formatted(displayName(user), user.username(), VibelyEmailLayout.SUPPORT_EMAIL);
    }

    private String htmlBody(AdminDeletedUserInfo user) {
        String bodyRows = VibelyEmailLayout.headingRow("Tài khoản của bạn đã bị xóa") + """
            <tr>
              <td style="padding:0 56px 28px;font-size:15px;line-height:1.7;color:#161823;">
                <p style="margin:0 0 16px;">Xin chào <strong>%s</strong>,</p>
                <p style="margin:0 0 16px;">Tài khoản Vibely <strong>@%s</strong> của bạn đã bị xóa bởi quản trị viên.</p>
                <p style="margin:0 0 16px;">Toàn bộ dữ liệu liên quan đến tài khoản có thể không còn truy cập được trên Vibely.</p>
                <p style="margin:0;">Nếu bạn cho rằng đây là nhầm lẫn, vui lòng liên hệ đội ngũ hỗ trợ Vibely qua %s.</p>
              </td>
            </tr>
            """.formatted(
            VibelyEmailLayout.escapeHtml(displayName(user)),
            VibelyEmailLayout.escapeHtml(user.username()),
            VibelyEmailLayout.supportEmailLink()
        );
        return VibelyEmailLayout.document("Tài khoản Vibely của bạn đã bị xóa", bodyRows, user.username());
    }

    private String updatePlainBody(AdminUpdatedUserInfo user) {
        return """
            Xin chào %s,

            Quản trị viên Vibely vừa cập nhật thông tin tài khoản của bạn:
            %s

            Nếu bạn không nhận ra thay đổi này, vui lòng liên hệ đội ngũ hỗ trợ Vibely qua %s.

            Vibely
            """.formatted(displayName(user), updateChangeLines(user), VibelyEmailLayout.SUPPORT_EMAIL);
    }

    private String updateHtmlBody(AdminUpdatedUserInfo user) {
        String bodyRows = VibelyEmailLayout.headingRow("Thông tin tài khoản đã được cập nhật") + """
            <tr>
              <td style="padding:0 56px 28px;font-size:15px;line-height:1.7;color:#161823;">
                <p style="margin:0 0 16px;">Xin chào <strong>%s</strong>,</p>
                <p style="margin:0 0 16px;">Quản trị viên Vibely vừa cập nhật thông tin tài khoản của bạn:</p>
                <ul style="margin:0 0 18px;padding-left:20px;">%s</ul>
                <p style="margin:0;">Nếu bạn không nhận ra thay đổi này, vui lòng liên hệ đội ngũ hỗ trợ Vibely qua %s.</p>
              </td>
            </tr>
            """.formatted(
            VibelyEmailLayout.escapeHtml(displayName(user)),
            updateChangeItems(user),
            VibelyEmailLayout.supportEmailLink()
        );
        return VibelyEmailLayout.document("Thông tin tài khoản Vibely đã được cập nhật", bodyRows, user.newUsername());
    }

    private String displayName(AdminDeletedUserInfo user) {
        return StringUtils.hasText(user.displayName()) ? user.displayName().trim() : "bạn";
    }

    private String displayName(AdminUpdatedUserInfo user) {
        return StringUtils.hasText(user.displayName()) ? user.displayName().trim() : "bạn";
    }

    private String updateChangeLines(AdminUpdatedUserInfo user) {
        StringBuilder lines = new StringBuilder();
        if (user.usernameChanged()) {
            lines.append("- Vibely ID đổi từ @")
                .append(user.oldUsername())
                .append(" sang @")
                .append(user.newUsername())
                .append('\n');
        }
        if (user.passwordChanged()) {
            lines.append("- Mật khẩu đăng nhập đã được thay đổi\n");
        }
        return lines.toString().trim();
    }

    private String updateChangeItems(AdminUpdatedUserInfo user) {
        StringBuilder items = new StringBuilder();
        if (user.usernameChanged()) {
            items.append("<li>Vibely ID đổi từ <strong>@")
                .append(VibelyEmailLayout.escapeHtml(user.oldUsername()))
                .append("</strong> sang <strong>@")
                .append(VibelyEmailLayout.escapeHtml(user.newUsername()))
                .append("</strong></li>");
        }
        if (user.passwordChanged()) {
            items.append("<li>Mật khẩu đăng nhập đã được thay đổi</li>");
        }
        return items.toString();
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
