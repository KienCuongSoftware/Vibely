package com.vibely.backend.auth.mail;

import com.vibely.backend.auth.dto.BanAppealRequest;
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

    public void sendAppeal(BanAppealRequest request, Long appealId) {
        if (!mailProperties.isEnabled()) {
            log.info(
                "Ban appeal email skipped (app.mail.enabled=false). appealId={} from={}",
                appealId,
                EmailMasking.mask(request.email())
            );
            return;
        }

        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            log.warn("Ban appeal email skipped: JavaMailSender not configured. appealId={}", appealId);
            return;
        }

        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, StandardCharsets.UTF_8.name());
            helper.setTo(VibelyEmailLayout.SUPPORT_EMAIL);
            helper.setFrom(mailProperties.getFrom());
            helper.setReplyTo(request.email().trim());
            helper.setSubject(buildSubject(appealId));
            helper.setText(buildPlainText(request, appealId), buildHtml(request, appealId));
            mailSender.send(mimeMessage);
        } catch (Exception ex) {
            log.error("Failed to send ban appeal email. appealId={}", appealId, ex);
            throw new RuntimeException("Không gửi được khiếu nại, vui lòng thử lại sau");
        }
    }

    private String buildSubject(Long appealId) {
        if (appealId == null) {
            return "[Vibely] Khiếu nại cấm tài khoản";
        }
        return "[Vibely] Khiếu nại cấm tài khoản #" + appealId;
    }

    private String buildPlainText(BanAppealRequest request, Long appealId) {
        StringBuilder body = new StringBuilder();
        body.append("Khiếu nại cấm tài khoản Vibely\n\n");
        if (appealId != null) {
            body.append("Mã khiếu nại: #").append(appealId).append('\n');
            body.append("Xem trong Admin: /admin/ban-appeals\n\n");
        }
        body.append("Email liên hệ: ").append(request.email().trim()).append('\n');
        if (StringUtils.hasText(request.maskedAccountEmail())) {
            body.append("Email tài khoản (ẩn): ").append(request.maskedAccountEmail().trim()).append('\n');
        }
        if (StringUtils.hasText(request.banReason())) {
            body.append("Lý do cấm được thông báo: ").append(request.banReason().trim()).append('\n');
        }
        body.append("\nMô tả:\n").append(request.description().trim());
        return body.toString();
    }

    private String buildHtml(BanAppealRequest request, Long appealId) {
        String description = VibelyEmailLayout.escapeHtml(request.description().trim());
        String banReason = StringUtils.hasText(request.banReason())
            ? VibelyEmailLayout.escapeHtml(request.banReason().trim())
            : "Không có lý do cụ thể";
        String masked = StringUtils.hasText(request.maskedAccountEmail())
            ? VibelyEmailLayout.escapeHtml(request.maskedAccountEmail().trim())
            : "—";
        String appealMeta = appealId == null
            ? ""
            : "<p style=\"margin:0 0 12px;\"><strong>Mã khiếu nại:</strong> #" + appealId + "</p>";

        String bodyRows = VibelyEmailLayout.headingRow("Khiếu nại cấm tài khoản") + """
            <tr>
              <td style="padding:0 56px 28px;font-size:15px;line-height:1.7;color:#161823;">
                %s
                <p style="margin:0 0 12px;">Email liên hệ: <strong>%s</strong></p>
                <p style="margin:0 0 8px;"><strong>Email tài khoản (ẩn):</strong> %s</p>
                <p style="margin:0 0 8px;"><strong>Lý do cấm được thông báo:</strong> %s</p>
                <p style="margin:0 0 8px;"><strong>Mô tả:</strong></p>
                <p style="margin:0;white-space:pre-wrap;background:#f7f7f8;border-radius:10px;padding:16px 18px;color:#4b5563;">%s</p>
              </td>
            </tr>
            """.formatted(
            appealMeta,
            VibelyEmailLayout.escapeHtml(request.email().trim()),
            masked,
            banReason,
            description
        );
        return VibelyEmailLayout.document("Khiếu nại cấm tài khoản", bodyRows, "");
    }
}
