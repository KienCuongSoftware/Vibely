package com.vibely.backend.auth.mail;

import com.vibely.backend.common.BadRequestException;
import com.vibely.backend.auth.OtpRequestMetadata;
import jakarta.mail.internet.MimeMessage;
import java.nio.charset.StandardCharsets;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
@SuppressWarnings("null")
public class OtpVerificationEmailSender {

    private static final Logger log = LoggerFactory.getLogger(OtpVerificationEmailSender.class);

    private final OtpMailProperties mailProperties;
    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final String helpUrl;
    private final String smtpUsername;

    public OtpVerificationEmailSender(
        OtpMailProperties mailProperties,
        ObjectProvider<JavaMailSender> mailSenderProvider,
        @Value("${app.urls.frontend-base-url:http://localhost:5173}") String frontendBaseUrl,
        @Value("${spring.mail.username:}") String smtpUsername
    ) {
        this.mailProperties = mailProperties;
        this.mailSenderProvider = mailSenderProvider;
        this.helpUrl = frontendBaseUrl + "/help";
        this.smtpUsername = smtpUsername;
    }

    public boolean sendPasswordResetCode(String toEmail, String code, int expirySeconds) {
        if (!mailProperties.isEnabled()) {
            log.info("Password reset email skipped (app.mail.enabled=false). recipient={}", maskEmail(toEmail));
            return false;
        }

        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            log.warn("Password reset email skipped: JavaMailSender not configured");
            return false;
        }

        String expiryLabel = OtpVerificationEmailTemplate.formatExpiryLabel(expirySeconds);
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
            helper.setFrom(resolveFromAddress(), mailProperties.getFromName());
            helper.setTo(toEmail);
            helper.setSubject(OtpVerificationEmailTemplate.subject(code));
            helper.setText(
                OtpVerificationEmailTemplate.passwordResetPlainBody(code, expiryLabel),
                OtpVerificationEmailTemplate.passwordResetHtmlBody(code, expiryLabel, helpUrl)
            );
            mailSender.send(message);
            log.info("Password reset email sent to {}", maskEmail(toEmail));
            return true;
        } catch (Exception ex) {
            log.error("Failed to send password reset email to {}", maskEmail(toEmail), ex);
            throw new BadRequestException(
                "Không gửi được email xác minh. Vui lòng kiểm tra cấu hình SMTP hoặc thử lại sau."
            );
        }
    }

    public boolean sendAccountDeactivationCode(
        String toEmail,
        String username,
        String code,
        int expirySeconds,
        OtpRequestMetadata metadata
    ) {
        if (!mailProperties.isEnabled()) {
            log.info("Account deactivation email skipped (app.mail.enabled=false). recipient={}", maskEmail(toEmail));
            return false;
        }

        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            log.warn("Account deactivation email skipped: JavaMailSender not configured");
            return false;
        }

        String expiryLabel = OtpVerificationEmailTemplate.formatExpiryLabel(expirySeconds);
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
            helper.setFrom(resolveFromAddress(), mailProperties.getFromName());
            helper.setTo(toEmail);
            helper.setSubject(OtpVerificationEmailTemplate.accountDeactivationSubject(code));
            helper.setText(
                OtpVerificationEmailTemplate.accountDeactivationPlainBody(username, code, expiryLabel, metadata),
                OtpVerificationEmailTemplate.accountDeactivationHtmlBody(
                    username,
                    code,
                    expiryLabel,
                    helpUrl,
                    metadata
                )
            );
            mailSender.send(message);
            log.info("Account deactivation email sent to {}", maskEmail(toEmail));
            return true;
        } catch (Exception ex) {
            log.error("Failed to send account deactivation email to {}", maskEmail(toEmail), ex);
            throw new BadRequestException(
                "Không gửi được email xác minh. Vui lòng kiểm tra cấu hình SMTP hoặc thử lại sau."
            );
        }
    }

    public boolean sendVerificationCode(String toEmail, String code, int expirySeconds) {
        if (!mailProperties.isEnabled()) {
            log.info("OTP email skipped (app.mail.enabled=false). recipient={}", maskEmail(toEmail));
            return false;
        }

        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            log.warn("OTP email skipped: JavaMailSender not configured (set spring.mail.host)");
            return false;
        }

        String expiryLabel = OtpVerificationEmailTemplate.formatExpiryLabel(expirySeconds);
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
            helper.setFrom(resolveFromAddress(), mailProperties.getFromName());
            helper.setTo(toEmail);
            helper.setSubject(OtpVerificationEmailTemplate.subject(code));
            helper.setText(
                OtpVerificationEmailTemplate.plainBody(code, expiryLabel),
                OtpVerificationEmailTemplate.htmlBody(code, expiryLabel, helpUrl)
            );
            mailSender.send(message);
            log.info("OTP verification email sent to {}", maskEmail(toEmail));
            return true;
        } catch (Exception ex) {
            log.error("Failed to send OTP email to {}", maskEmail(toEmail), ex);
            throw new BadRequestException(
                "Không gửi được email xác minh. Vui lòng kiểm tra cấu hình SMTP hoặc thử lại sau."
            );
        }
    }

    private String resolveFromAddress() {
        String configured = mailProperties.getFrom();
        if (configured != null && !configured.isBlank()) {
            return configured.trim();
        }
        if (smtpUsername != null && !smtpUsername.isBlank()) {
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
