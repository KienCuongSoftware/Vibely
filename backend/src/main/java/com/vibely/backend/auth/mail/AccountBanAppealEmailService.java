package com.vibely.backend.auth.mail;

import com.vibely.backend.auth.dto.BanAppealRequest;
import com.vibely.backend.auth.entity.BanAppeal;
import com.vibely.backend.auth.entity.BanAppealStatus;
import jakarta.mail.internet.MimeMessage;
import java.nio.charset.StandardCharsets;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class AccountBanAppealEmailService {

    private static final Logger log = LoggerFactory.getLogger(AccountBanAppealEmailService.class);

    private final OtpMailProperties mailProperties;
    private final ObjectProvider<JavaMailSender> mailSenderProvider;

    public AccountBanAppealEmailService(
        OtpMailProperties mailProperties,
        ObjectProvider<JavaMailSender> mailSenderProvider
    ) {
        this.mailProperties = mailProperties;
        this.mailSenderProvider = mailSenderProvider;
    }

    public void sendAppeal(BanAppealRequest request, String displayName) {
        if (!mailProperties.isEnabled()) {
            log.info(
                "Ban appeal email skipped (app.mail.enabled=false). from={}",
                EmailMasking.mask(request.email())
            );
            return;
        }

        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            log.warn("Ban appeal email skipped: JavaMailSender not configured");
            return;
        }

        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, StandardCharsets.UTF_8.name());
            helper.setTo(VibelyEmailLayout.SUPPORT_EMAIL);
            helper.setFrom(mailProperties.getFrom());
            helper.setReplyTo(request.email().trim());
            helper.setSubject("[Vibely] Account ban appeal");
            helper.setText(buildPlainText(request, displayName), buildHtml(request, displayName));
            mailSender.send(mimeMessage);
        } catch (Exception ex) {
            log.error("Failed to send ban appeal email", ex);
            throw new RuntimeException("Could not submit appeal, please try again later");
        }
    }

    /**
     * Gửi kết quả khiếu nại tới email liên hệ mà người dùng đã cung cấp khi nộp đơn.
     * Soft-fail: lỗi gửi mail không làm rollback cập nhật trạng thái.
     */
    public void sendAppealDecision(BanAppeal appeal, String displayName) {
        if (appeal == null || !StringUtils.hasText(appeal.getContactEmail())) {
            return;
        }
        String recipient = appeal.getContactEmail().trim();
        if (!mailProperties.isEnabled()) {
            log.info(
                "Ban appeal decision email skipped (app.mail.enabled=false). to={}",
                EmailMasking.mask(recipient)
            );
            return;
        }

        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            log.warn("Ban appeal decision email skipped: JavaMailSender not configured");
            return;
        }

        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, StandardCharsets.UTF_8.name());
            helper.setTo(recipient);
            helper.setFrom(mailProperties.getFrom());
            helper.setSubject(buildDecisionSubject(appeal.getStatus()));
            helper.setText(
                buildDecisionPlainText(appeal, displayName),
                buildDecisionHtml(appeal, displayName)
            );
            mailSender.send(mimeMessage);
            log.info(
                "Ban appeal decision email sent. status={} to={}",
                appeal.getStatus(),
                EmailMasking.mask(recipient)
            );
        } catch (Exception ex) {
            log.warn(
                "Failed to send ban appeal decision email. to={}",
                EmailMasking.mask(recipient),
                ex
            );
        }
    }

    private String buildDecisionSubject(BanAppealStatus status) {
        return "[Vibely] Appeal result — " + statusLabel(status);
    }

    private String buildDecisionPlainText(BanAppeal appeal, String displayName) {
        StringBuilder body = new StringBuilder();
        body.append("Hello, ").append(resolveDisplayName(displayName)).append(",\n\n");
        body.append("We have updated your appeal result.\n\n");
        body.append("Status: ").append(statusLabel(appeal.getStatus())).append('\n');
        body.append(statusExplanation(appeal.getStatus())).append("\n\n");
        if (StringUtils.hasText(appeal.getAdminNotes())) {
            body.append("Note from the Vibely team:\n");
            body.append(appeal.getAdminNotes().trim()).append("\n\n");
        }
        body.append("If you have questions, please contact ").append(VibelyEmailLayout.SUPPORT_EMAIL).append(".\n\n");
        body.append("Vibely");
        return body.toString();
    }

    private String buildDecisionHtml(BanAppeal appeal, String displayName) {
        String notesBlock = StringUtils.hasText(appeal.getAdminNotes())
            ? """
                <p style="margin:0 0 8px;"><strong>Note from the Vibely team:</strong></p>
                <p style="margin:0 0 16px;white-space:pre-wrap;background:#f7f7f8;border-radius:10px;padding:16px 18px;color:#4b5563;">%s</p>
                """.formatted(VibelyEmailLayout.escapeHtml(appeal.getAdminNotes().trim()))
            : "";

        String bodyRows = VibelyEmailLayout.headingRow("Appeal result") + """
            <tr>
              <td style="padding:0 56px 28px;font-size:15px;line-height:1.7;color:#161823;">
                <p style="margin:0 0 16px;">Hello, <strong>%s</strong>,</p>
                <p style="margin:0 0 16px;">We have updated your appeal result.</p>
                <div style="margin:0 0 16px;background:#f7f7f8;border-radius:10px;padding:18px 20px;font-size:14px;line-height:1.7;color:#4b5563;">
                  <div>Status: <strong style="color:#161823;">%s</strong></div>
                </div>
                <p style="margin:0 0 16px;">%s</p>
                %s
                <p style="margin:0;">If you have questions, please contact %s.</p>
              </td>
            </tr>
            """.formatted(
            VibelyEmailLayout.escapeHtml(resolveDisplayName(displayName)),
            VibelyEmailLayout.escapeHtml(statusLabel(appeal.getStatus())),
            VibelyEmailLayout.escapeHtml(statusExplanation(appeal.getStatus())),
            notesBlock,
            VibelyEmailLayout.supportEmailLink()
        );
        return VibelyEmailLayout.document(buildDecisionSubject(appeal.getStatus()), bodyRows, "");
    }

    private String buildPlainText(BanAppealRequest request, String displayName) {
        StringBuilder body = new StringBuilder();
        body.append("Hello, ").append(resolveDisplayName(displayName)).append(",\n\n");
        body.append("Account ban appeal Vibely\n\n");
        body.append("Xem trong Admin: /admin/ban-appeals\n\n");
        body.append("Contact email: ").append(request.email().trim()).append('\n');
        if (StringUtils.hasText(request.maskedAccountEmail())) {
            body.append("Account email (masked): ").append(request.maskedAccountEmail().trim()).append('\n');
        }
        if (StringUtils.hasText(request.banReason())) {
            body.append("Notified ban reason: ").append(request.banReason().trim()).append('\n');
        }
        body.append("\nDescription:\n").append(request.description().trim());
        return body.toString();
    }

    private String buildHtml(BanAppealRequest request, String displayName) {
        String description = VibelyEmailLayout.escapeHtml(request.description().trim());
        String banReason = StringUtils.hasText(request.banReason())
            ? VibelyEmailLayout.escapeHtml(request.banReason().trim())
            : "No specific reason";
        String masked = StringUtils.hasText(request.maskedAccountEmail())
            ? VibelyEmailLayout.escapeHtml(request.maskedAccountEmail().trim())
            : "—";

        String bodyRows = VibelyEmailLayout.headingRow("Account ban appeal") + """
            <tr>
              <td style="padding:0 56px 28px;font-size:15px;line-height:1.7;color:#161823;">
                <p style="margin:0 0 16px;">Hello, <strong>%s</strong>,</p>
                <p style="margin:0 0 12px;">Contact email: <strong>%s</strong></p>
                <p style="margin:0 0 8px;"><strong>Account email (masked):</strong> %s</p>
                <p style="margin:0 0 8px;"><strong>Notified ban reason:</strong> %s</p>
                <p style="margin:0 0 8px;"><strong>Description:</strong></p>
                <p style="margin:0;white-space:pre-wrap;background:#f7f7f8;border-radius:10px;padding:16px 18px;color:#4b5563;">%s</p>
              </td>
            </tr>
            """.formatted(
            VibelyEmailLayout.escapeHtml(resolveDisplayName(displayName)),
            VibelyEmailLayout.escapeHtml(request.email().trim()),
            masked,
            banReason,
            description
        );
        return VibelyEmailLayout.document("Account ban appeal", bodyRows, "");
    }

    private static String statusLabel(BanAppealStatus status) {
        if (status == null) {
            return "Unknown";
        }
        return switch (status) {
            case PENDING -> "Pending";
            case IN_REVIEW -> "Under review";
            case APPROVED -> "Approved";
            case REJECTED -> "Rejected";
        };
    }

    private static String statusExplanation(BanAppealStatus status) {
        if (status == null) {
            return "";
        }
        return switch (status) {
            case PENDING -> "Your appeal is pending review.";
            case IN_REVIEW -> "The Vibely team is reviewing your appeal.";
            case APPROVED ->
                "Your appeal was approved. Your account has been unlocked and you can log in again.";
            case REJECTED ->
                "Your appeal was rejected. The account remains restricted under Vibely community standards.";
        };
    }

    private static String resolveDisplayName(String displayName) {
        if (StringUtils.hasText(displayName)) {
            return displayName.trim();
        }
        return "you";
    }
}
