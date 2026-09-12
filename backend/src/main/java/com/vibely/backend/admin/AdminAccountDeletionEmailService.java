package com.vibely.backend.admin;

import com.vibely.backend.auth.mail.EmailLocale;
import com.vibely.backend.auth.mail.EmailLocales;
import com.vibely.backend.auth.mail.MailCopy;
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
            helper.setSubject(MailCopy.get(locale(deletedUser.preferredLocale()), "delete.subject"));
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
            helper.setSubject(MailCopy.get(locale(updatedUser.preferredLocale()), "update.subject"));
            helper.setText(updatePlainBody(updatedUser), updateHtmlBody(updatedUser));
            mailSender.send(message);
            log.info("Admin account update email sent to {}", maskEmail(updatedUser.email()));
        } catch (Exception ex) {
            log.warn("Failed to send admin account update email to {}", maskEmail(updatedUser.email()), ex);
        }
    }

    private String plainBody(AdminDeletedUserInfo user) {
        EmailLocale locale = locale(user.preferredLocale());
        return """
            %s %s,

            %s @%s %s
            %s

            %s %s.

            Vibely
            """.formatted(
            MailCopy.get(locale, "common.hello"),
            displayName(user, locale),
            MailCopy.get(locale, "account.your"),
            user.username(),
            MailCopy.get(locale, "delete.hasBeenDeleted"),
            MailCopy.get(locale, "delete.dataGone"),
            MailCopy.get(locale, "delete.mistake"),
            VibelyEmailLayout.SUPPORT_EMAIL
        );
    }

    private String htmlBody(AdminDeletedUserInfo user) {
        EmailLocale locale = locale(user.preferredLocale());
        String bodyRows = VibelyEmailLayout.headingRow(MailCopy.get(locale, "delete.heading")) + """
            <tr>
              <td style="padding:0 56px 28px;font-size:15px;line-height:1.7;color:#161823;">
                <p style="margin:0 0 16px;">%s <strong>%s</strong>,</p>
                <p style="margin:0 0 16px;">%s <strong>@%s</strong> %s</p>
                <p style="margin:0 0 16px;">%s</p>
                <p style="margin:0;">%s %s.</p>
              </td>
            </tr>
            """.formatted(
            MailCopy.get(locale, "common.hello"),
            VibelyEmailLayout.escapeHtml(displayName(user, locale)),
            MailCopy.get(locale, "account.your"),
            VibelyEmailLayout.escapeHtml(user.username()),
            MailCopy.get(locale, "delete.hasBeenDeleted"),
            MailCopy.get(locale, "delete.dataGone"),
            MailCopy.get(locale, "delete.mistake"),
            VibelyEmailLayout.supportEmailLink()
        );
        return VibelyEmailLayout.document(
            MailCopy.get(locale, "delete.subject"),
            bodyRows,
            user.username(),
            locale
        );
    }

    private String updatePlainBody(AdminUpdatedUserInfo user) {
        EmailLocale locale = locale(user.preferredLocale());
        return """
            %s %s,

            %s
            %s

            %s %s.

            Vibely
            """.formatted(
            MailCopy.get(locale, "common.hello"),
            displayName(user, locale),
            MailCopy.get(locale, "update.adminUpdated"),
            updateChangeLines(user, locale),
            MailCopy.get(locale, "update.unrecognized"),
            VibelyEmailLayout.SUPPORT_EMAIL
        );
    }

    private String updateHtmlBody(AdminUpdatedUserInfo user) {
        EmailLocale locale = locale(user.preferredLocale());
        String bodyRows = VibelyEmailLayout.headingRow(MailCopy.get(locale, "update.heading")) + """
            <tr>
              <td style="padding:0 56px 28px;font-size:15px;line-height:1.7;color:#161823;">
                <p style="margin:0 0 16px;">%s <strong>%s</strong>,</p>
                <p style="margin:0 0 16px;">%s</p>
                <ul style="margin:0 0 18px;padding-left:20px;">%s</ul>
                <p style="margin:0;">%s %s.</p>
              </td>
            </tr>
            """.formatted(
            MailCopy.get(locale, "common.hello"),
            VibelyEmailLayout.escapeHtml(displayName(user, locale)),
            MailCopy.get(locale, "update.adminUpdated"),
            updateChangeItems(user, locale),
            MailCopy.get(locale, "update.unrecognized"),
            VibelyEmailLayout.supportEmailLink()
        );
        return VibelyEmailLayout.document(
            MailCopy.get(locale, "update.subject"),
            bodyRows,
            user.newUsername(),
            locale
        );
    }

    private String displayName(AdminDeletedUserInfo user, EmailLocale locale) {
        return StringUtils.hasText(user.displayName())
            ? user.displayName().trim()
            : MailCopy.get(locale, "common.you");
    }

    private String displayName(AdminUpdatedUserInfo user, EmailLocale locale) {
        return StringUtils.hasText(user.displayName())
            ? user.displayName().trim()
            : MailCopy.get(locale, "common.you");
    }

    private String updateChangeLines(AdminUpdatedUserInfo user, EmailLocale locale) {
        StringBuilder lines = new StringBuilder();
        if (user.usernameChanged()) {
            lines.append("- ")
                .append(MailCopy.get(locale, "update.idFrom", user.oldUsername()))
                .append(MailCopy.get(locale, "update.idTo", user.newUsername()))
                .append('\n');
        }
        if (user.passwordChanged()) {
            lines.append("- ")
                .append(MailCopy.get(locale, "update.passwordChanged"))
                .append('\n');
        }
        return lines.toString().trim();
    }

    private String updateChangeItems(AdminUpdatedUserInfo user, EmailLocale locale) {
        StringBuilder items = new StringBuilder();
        if (user.usernameChanged()) {
            items.append("<li>")
                .append(MailCopy.get(locale, "update.idFrom", VibelyEmailLayout.escapeHtml(user.oldUsername())))
                .append(MailCopy.get(locale, "update.idTo", VibelyEmailLayout.escapeHtml(user.newUsername())))
                .append("</li>");
        }
        if (user.passwordChanged()) {
            items.append("<li>")
                .append(MailCopy.get(locale, "update.passwordChanged"))
                .append("</li>");
        }
        return items.toString();
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
