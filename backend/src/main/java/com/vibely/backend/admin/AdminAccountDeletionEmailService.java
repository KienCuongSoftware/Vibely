package com.vibely.backend.admin;

import com.vibely.backend.auth.mail.OtpMailProperties;
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

            Nếu bạn cho rằng đây là nhầm lẫn, vui lòng liên hệ đội ngũ hỗ trợ Vibely.

            Vibely
            """.formatted(displayName(user), user.username());
    }

    private String htmlBody(AdminDeletedUserInfo user) {
        return """
            <div style="font-family:Arial,sans-serif;line-height:1.6;color:#18181b">
              <h2 style="margin:0 0 12px;color:#ef4444">Tài khoản Vibely của bạn đã bị xóa</h2>
              <p>Xin chào <strong>%s</strong>,</p>
              <p>Tài khoản Vibely <strong>@%s</strong> của bạn đã bị xóa bởi quản trị viên.</p>
              <p>Toàn bộ dữ liệu liên quan đến tài khoản có thể không còn truy cập được trên Vibely.</p>
              <p>Nếu bạn cho rằng đây là nhầm lẫn, vui lòng liên hệ đội ngũ hỗ trợ Vibely.</p>
              <p style="margin-top:24px;color:#71717a">Vibely</p>
            </div>
            """.formatted(escapeHtml(displayName(user)), escapeHtml(user.username()));
    }

    private String updatePlainBody(AdminUpdatedUserInfo user) {
        return """
            Xin chào %s,

            Quản trị viên Vibely vừa cập nhật thông tin tài khoản của bạn:
            %s

            Nếu bạn không nhận ra thay đổi này, vui lòng liên hệ đội ngũ hỗ trợ Vibely.

            Vibely
            """.formatted(displayName(user), updateChangeLines(user));
    }

    private String updateHtmlBody(AdminUpdatedUserInfo user) {
        return """
            <div style="font-family:Arial,sans-serif;line-height:1.6;color:#18181b">
              <h2 style="margin:0 0 12px;color:#ef4444">Thông tin tài khoản Vibely đã được cập nhật</h2>
              <p>Xin chào <strong>%s</strong>,</p>
              <p>Quản trị viên Vibely vừa cập nhật thông tin tài khoản của bạn:</p>
              <ul>%s</ul>
              <p>Nếu bạn không nhận ra thay đổi này, vui lòng liên hệ đội ngũ hỗ trợ Vibely.</p>
              <p style="margin-top:24px;color:#71717a">Vibely</p>
            </div>
            """.formatted(escapeHtml(displayName(user)), updateChangeItems(user));
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
                .append(escapeHtml(user.oldUsername()))
                .append("</strong> sang <strong>@")
                .append(escapeHtml(user.newUsername()))
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
        if (value == null) {
            return "";
        }
        return value
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;")
            .replace("'", "&#39;");
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
