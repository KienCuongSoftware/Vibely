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
    public void sendAppealDecision(BanAppeal appeal, String displayName, String preferredLocale) {
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
            helper.setSubject(buildDecisionSubject(appeal.getStatus(), EmailLocales.resolve(preferredLocale)));
            helper.setText(
                buildDecisionPlainText(appeal, displayName, EmailLocales.resolve(preferredLocale)),
                buildDecisionHtml(appeal, displayName, EmailLocales.resolve(preferredLocale))
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

    private String buildDecisionSubject(BanAppealStatus status, EmailLocale locale) {
        return "[Vibely] "
            + EmailLocales.pick(locale, "Appeal result — ", "Kết quả khiếu nại — ")
            + statusLabel(status, locale);
    }

    private String buildDecisionPlainText(BanAppeal appeal, String displayName, EmailLocale locale) {
        StringBuilder body = new StringBuilder();
        body.append(EmailLocales.pick(locale, "Hello, ", "Xin chào, "))
            .append(resolveDisplayName(displayName, locale))
            .append(",\n\n");
        body.append(EmailLocales.pick(locale, "We have updated your appeal result.\n\n", "Chúng tôi đã cập nhật kết quả khiếu nại của bạn.\n\n"));
        body.append(EmailLocales.pick(locale, "Status: ", "Trạng thái: "))
            .append(statusLabel(appeal.getStatus(), locale))
            .append('\n');
        body.append(statusExplanation(appeal.getStatus(), locale)).append("\n\n");
        if (StringUtils.hasText(appeal.getAdminNotes())) {
            body.append(EmailLocales.pick(locale, "Note from the Vibely team:\n", "Ghi chú từ đội ngũ Vibely:\n"));
            body.append(appeal.getAdminNotes().trim()).append("\n\n");
        }
        body.append(EmailLocales.pick(locale, "If you have questions, please contact ", "Nếu có thắc mắc, hãy liên hệ "))
            .append(VibelyEmailLayout.SUPPORT_EMAIL)
            .append(".\n\n");
        body.append("Vibely");
        return body.toString();
    }

    private String buildDecisionHtml(BanAppeal appeal, String displayName, EmailLocale locale) {
        String notesBlock = StringUtils.hasText(appeal.getAdminNotes())
            ? """
                <p style="margin:0 0 8px;"><strong>%s</strong></p>
                <p style="margin:0 0 16px;white-space:pre-wrap;background:#f7f7f8;border-radius:10px;padding:16px 18px;color:#4b5563;">%s</p>
                """.formatted(
                    EmailLocales.pick(locale, "Note from the Vibely team:", "Ghi chú từ đội ngũ Vibely:"),
                    VibelyEmailLayout.escapeHtml(appeal.getAdminNotes().trim())
                )
            : "";

        String bodyRows = VibelyEmailLayout.headingRow(
            EmailLocales.pick(locale, "Appeal result", "Kết quả khiếu nại")
        ) + """
            <tr>
              <td style="padding:0 56px 28px;font-size:15px;line-height:1.7;color:#161823;">
                <p style="margin:0 0 16px;">%s <strong>%s</strong>,</p>
                <p style="margin:0 0 16px;">%s</p>
                <div style="margin:0 0 16px;background:#f7f7f8;border-radius:10px;padding:18px 20px;font-size:14px;line-height:1.7;color:#4b5563;">
                  <div>%s <strong style="color:#161823;">%s</strong></div>
                </div>
                <p style="margin:0 0 16px;">%s</p>
                %s
                <p style="margin:0;">%s %s.</p>
              </td>
            </tr>
            """.formatted(
            EmailLocales.pick(locale, "Hello,", "Xin chào,"),
            VibelyEmailLayout.escapeHtml(resolveDisplayName(displayName, locale)),
            EmailLocales.pick(locale, "We have updated your appeal result.", "Chúng tôi đã cập nhật kết quả khiếu nại của bạn."),
            EmailLocales.pick(locale, "Status:", "Trạng thái:"),
            VibelyEmailLayout.escapeHtml(statusLabel(appeal.getStatus(), locale)),
            VibelyEmailLayout.escapeHtml(statusExplanation(appeal.getStatus(), locale)),
            notesBlock,
            EmailLocales.pick(locale, "If you have questions, please contact", "Nếu có thắc mắc, hãy liên hệ"),
            VibelyEmailLayout.supportEmailLink()
        );
        return VibelyEmailLayout.document(buildDecisionSubject(appeal.getStatus(), locale), bodyRows, "", locale);
    }

    private String buildPlainText(BanAppealRequest request, String displayName) {
        StringBuilder body = new StringBuilder();
        body.append("Hello, ").append(resolveDisplayName(displayName, EmailLocale.EN)).append(",\n\n");
        body.append("Account ban appeal Vibely\n\n");
        body.append("Ban appeal — view in Admin: /admin/ban-appeals\n\n");
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
            VibelyEmailLayout.escapeHtml(resolveDisplayName(displayName, EmailLocale.EN)),
            VibelyEmailLayout.escapeHtml(request.email().trim()),
            masked,
            banReason,
            description
        );
        return VibelyEmailLayout.document("Account ban appeal", bodyRows, "");
    }

    private static String statusLabel(BanAppealStatus status, EmailLocale locale) {
        if (status == null) {
            return EmailLocales.pick(locale, "Unknown", "Không rõ");
        }
        return switch (status) {
            case PENDING -> EmailLocales.pick(locale, "Pending", "Đang chờ");
            case IN_REVIEW -> EmailLocales.pick(locale, "Under review", "Đang xem xét");
            case APPROVED -> EmailLocales.pick(locale, "Approved", "Đã chấp nhận");
            case REJECTED -> EmailLocales.pick(locale, "Rejected", "Đã từ chối");
        };
    }

    private static String statusExplanation(BanAppealStatus status, EmailLocale locale) {
        if (status == null) {
            return "";
        }
        return switch (status) {
            case PENDING -> EmailLocales.pick(locale, "Your appeal is pending review.", "Khiếu nại của bạn đang chờ xem xét.");
            case IN_REVIEW -> EmailLocales.pick(locale, "The Vibely team is reviewing your appeal.", "Đội ngũ Vibely đang xem xét khiếu nại của bạn.");
            case APPROVED -> EmailLocales.pick(
                locale,
                "Your appeal was approved. Your account has been unlocked and you can log in again.",
                "Khiếu nại của bạn đã được chấp nhận. Tài khoản đã được mở khóa và bạn có thể đăng nhập lại."
            );
            case REJECTED -> EmailLocales.pick(
                locale,
                "Your appeal was rejected. The account remains restricted under Vibely community standards.",
                "Khiếu nại của bạn đã bị từ chối. Tài khoản vẫn bị hạn chế theo tiêu chuẩn cộng đồng Vibely."
            );
        };
    }

    private static String resolveDisplayName(String displayName, EmailLocale locale) {
        if (StringUtils.hasText(displayName)) {
            return displayName.trim();
        }
        return EmailLocales.pick(locale, "you", "bạn");
    }
}
