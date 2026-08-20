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
            helper.setSubject("Your Vibely account has been deleted");
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
            helper.setSubject("Your Vibely account information has been updated");
            helper.setText(updatePlainBody(updatedUser), updateHtmlBody(updatedUser));
            mailSender.send(message);
            log.info("Admin account update email sent to {}", maskEmail(updatedUser.email()));
        } catch (Exception ex) {
            log.warn("Failed to send admin account update email to {}", maskEmail(updatedUser.email()), ex);
        }
    }

    private String plainBody(AdminDeletedUserInfo user) {
        return """
            Hello %s,

            Your Vibely account @%s has been deleted by an administrator.
            All data related to the account may no longer be accessible on Vibely.

            If you believe this is a mistake, please contact Vibely support at %s.

            Vibely
            """.formatted(displayName(user), user.username(), VibelyEmailLayout.SUPPORT_EMAIL);
    }

    private String htmlBody(AdminDeletedUserInfo user) {
        String bodyRows = VibelyEmailLayout.headingRow("Your account has been deleted") + """
            <tr>
              <td style="padding:0 56px 28px;font-size:15px;line-height:1.7;color:#161823;">
                <p style="margin:0 0 16px;">Hello <strong>%s</strong>,</p>
                <p style="margin:0 0 16px;">Your Vibely account <strong>@%s</strong> has been deleted by an administrator.</p>
                <p style="margin:0 0 16px;">All data related to the account may no longer be accessible on Vibely.</p>
                <p style="margin:0;">If you believe this is a mistake, please contact Vibely support at %s.</p>
              </td>
            </tr>
            """.formatted(
            VibelyEmailLayout.escapeHtml(displayName(user)),
            VibelyEmailLayout.escapeHtml(user.username()),
            VibelyEmailLayout.supportEmailLink()
        );
        return VibelyEmailLayout.document("Your Vibely account has been deleted", bodyRows, user.username());
    }

    private String updatePlainBody(AdminUpdatedUserInfo user) {
        return """
            Hello %s,

            A Vibely administrator has updated your account information:
            %s

            If you do not recognize this change, please contact Vibely support at %s.

            Vibely
            """.formatted(displayName(user), updateChangeLines(user), VibelyEmailLayout.SUPPORT_EMAIL);
    }

    private String updateHtmlBody(AdminUpdatedUserInfo user) {
        String bodyRows = VibelyEmailLayout.headingRow("Account information has been updated") + """
            <tr>
              <td style="padding:0 56px 28px;font-size:15px;line-height:1.7;color:#161823;">
                <p style="margin:0 0 16px;">Hello <strong>%s</strong>,</p>
                <p style="margin:0 0 16px;">A Vibely administrator has updated your account information:</p>
                <ul style="margin:0 0 18px;padding-left:20px;">%s</ul>
                <p style="margin:0;">If you do not recognize this change, please contact Vibely support at %s.</p>
              </td>
            </tr>
            """.formatted(
            VibelyEmailLayout.escapeHtml(displayName(user)),
            updateChangeItems(user),
            VibelyEmailLayout.supportEmailLink()
        );
        return VibelyEmailLayout.document("Vibely account information has been updated", bodyRows, user.newUsername());
    }

    private String displayName(AdminDeletedUserInfo user) {
        return StringUtils.hasText(user.displayName()) ? user.displayName().trim() : "you";
    }

    private String displayName(AdminUpdatedUserInfo user) {
        return StringUtils.hasText(user.displayName()) ? user.displayName().trim() : "you";
    }

    private String updateChangeLines(AdminUpdatedUserInfo user) {
        StringBuilder lines = new StringBuilder();
        if (user.usernameChanged()) {
            lines.append("- Vibely ID changed from @")
                .append(user.oldUsername())
                .append(" sang @")
                .append(user.newUsername())
                .append('\n');
        }
        if (user.passwordChanged()) {
            lines.append("- Login password has been changed\n");
        }
        return lines.toString().trim();
    }

    private String updateChangeItems(AdminUpdatedUserInfo user) {
        StringBuilder items = new StringBuilder();
        if (user.usernameChanged()) {
            items.append("<li>Vibely ID changed from <strong>@")
                .append(VibelyEmailLayout.escapeHtml(user.oldUsername()))
                .append("</strong> sang <strong>@")
                .append(VibelyEmailLayout.escapeHtml(user.newUsername()))
                .append("</strong></li>");
        }
        if (user.passwordChanged()) {
            items.append("<li>Login password has been changed</li>");
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
