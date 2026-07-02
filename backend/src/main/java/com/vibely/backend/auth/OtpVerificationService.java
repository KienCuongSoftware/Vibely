package com.vibely.backend.auth;

import com.vibely.backend.antibot.domain.CaptchaPurpose;
import com.vibely.backend.antibot.security.VerificationTokenStore;
import com.vibely.backend.auth.mail.OtpMailProperties;
import com.vibely.backend.auth.mail.OtpVerificationEmailSender;
import com.vibely.backend.common.BadRequestException;
import com.vibely.backend.user.entity.User;
import com.vibely.backend.user.repository.UserRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.Optional;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class OtpVerificationService {

    private final OtpChallengeRepository otpChallengeRepository;
    private final OtpVerificationCodeRepository otpVerificationCodeRepository;
    private final VerificationTokenStore verificationTokenStore;
    private final OtpVerificationEmailSender emailSender;
    private final OtpMailProperties mailProperties;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final int resendCooldownSeconds;
    private final int codeExpirySeconds;

    public OtpVerificationService(
        OtpChallengeRepository otpChallengeRepository,
        OtpVerificationCodeRepository otpVerificationCodeRepository,
        VerificationTokenStore verificationTokenStore,
        OtpVerificationEmailSender emailSender,
        OtpMailProperties mailProperties,
        UserRepository userRepository,
        PasswordEncoder passwordEncoder,
        @Value("${app.auth.otp-resend-seconds:60}") int resendCooldownSeconds,
        @Value("${app.auth.otp-expiry-seconds:600}") int codeExpirySeconds
    ) {
        this.otpChallengeRepository = otpChallengeRepository;
        this.otpVerificationCodeRepository = otpVerificationCodeRepository;
        this.verificationTokenStore = verificationTokenStore;
        this.emailSender = emailSender;
        this.mailProperties = mailProperties;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.resendCooldownSeconds = resendCooldownSeconds;
        this.codeExpirySeconds = codeExpirySeconds;
    }

    public SendCodeResponse sendCode(SendCodeRequest request, String verificationToken) {
        return sendCode(request, verificationToken, OtpRequestMetadata.unknown());
    }

    public SendCodeResponse sendCode(
        SendCodeRequest request,
        String verificationToken,
        OtpRequestMetadata metadata
    ) {
        String email = request.getEmail().trim().toLowerCase();
        OtpCodePurpose purpose = OtpCodePurpose.fromRequestValue(request.getPurpose());

        if (!isHumanVerified(request, verificationToken, purpose)) {
            logChallenge(email, false, "captcha", "verification failed");
            throw new BadRequestException("Xác minh chống spam thất bại, vui lòng thử lại");
        }

        if (purpose == OtpCodePurpose.PASSWORD_RESET && !userRepository.existsByEmail(email)) {
            enforceResendCooldown(email, purpose);
            return new SendCodeResponse(resendCooldownSeconds, codeExpirySeconds, false, null);
        }

        enforceResendCooldown(email, purpose);
        String code = generateSixDigitCode();
        logChallenge(email, true, "captcha", "verified");

        OtpVerificationCode otpCode = new OtpVerificationCode();
        otpCode.setEmail(email);
        otpCode.setPurpose(purpose.name());
        otpCode.setCodeHash(hash(code));
        otpCode.setExpiresAt(LocalDateTime.now().plusSeconds(codeExpirySeconds));
        otpCode.setConsumed(false);
        otpVerificationCodeRepository.save(otpCode);
        otpVerificationCodeRepository.deleteByExpiresAtBefore(LocalDateTime.now().minusDays(1));

        boolean emailSent;
        if (purpose == OtpCodePurpose.PASSWORD_RESET) {
            emailSent = emailSender.sendPasswordResetCode(email, code, codeExpirySeconds);
        } else if (purpose == OtpCodePurpose.ACCOUNT_DEACTIVATION) {
            String username = userRepository.findByEmail(email)
                .map(User::getUsername)
                .orElse(email);
            emailSent = emailSender.sendAccountDeactivationCode(email, username, code, codeExpirySeconds, metadata);
        } else if (purpose == OtpCodePurpose.ACCOUNT_REACTIVATION) {
            String username = userRepository.findByEmail(email)
                .map(User::getUsername)
                .orElse(email);
            emailSent = emailSender.sendAccountReactivationCode(email, username, code, codeExpirySeconds, metadata);
        } else if (purpose == OtpCodePurpose.ACCOUNT_DELETION) {
            String username = userRepository.findByEmail(email)
                .map(User::getUsername)
                .orElse(email);
            emailSent = emailSender.sendAccountDeletionCode(email, username, code, codeExpirySeconds, metadata);
        } else {
            emailSent = emailSender.sendVerificationCode(email, code, codeExpirySeconds);
        }

        String demoCode = null;
        if (!emailSent && mailProperties.isExposeCodeInApi()) {
            demoCode = code;
        }
        return new SendCodeResponse(resendCooldownSeconds, codeExpirySeconds, emailSent, demoCode);
    }

    public VerifyCodeResponse verifyCode(VerifyCodeRequest request) {
        OtpCodePurpose purpose = OtpCodePurpose.fromRequestValue(request.getPurpose());
        validateOtpCode(request.getEmail(), request.getCode(), purpose, true);
        return new VerifyCodeResponse(true);
    }

    public void resetPassword(ResetPasswordRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        OtpVerificationCode otpCode = validateOtpCode(
            email,
            request.getCode(),
            OtpCodePurpose.PASSWORD_RESET,
            true
        );

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new BadRequestException("Không tìm thấy tài khoản với email này"));

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        otpCode.setConsumed(true);
    }

    public void consumeAccountDeactivationCode(String email, String code) {
        validateOtpCode(email, code, OtpCodePurpose.ACCOUNT_DEACTIVATION, true);
    }

    public void consumeAccountReactivationCode(String email, String code) {
        validateOtpCode(email, code, OtpCodePurpose.ACCOUNT_REACTIVATION, true);
    }

    public void consumeAccountDeletionCode(String email, String code) {
        validateOtpCode(email, code, OtpCodePurpose.ACCOUNT_DELETION, true);
    }

    private OtpVerificationCode validateOtpCode(
        String rawEmail,
        String rawCode,
        OtpCodePurpose purpose,
        boolean consume
    ) {
        String email = rawEmail.trim().toLowerCase();
        OtpVerificationCode otpCode = otpVerificationCodeRepository
            .findTopByEmailAndPurposeAndConsumedFalseOrderByCreatedAtDesc(email, purpose.name())
            .orElseThrow(() -> new BadRequestException("Mã xác minh không hợp lệ"));

        if (otpCode.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("Mã xác minh đã hết hạn");
        }

        if (!otpCode.getCodeHash().equals(hash(rawCode.trim()))) {
            throw new BadRequestException("Mã xác minh không chính xác");
        }

        if (consume) {
            otpCode.setConsumed(true);
        }
        return otpCode;
    }

    private boolean isHumanVerified(
        SendCodeRequest request,
        String verificationToken,
        OtpCodePurpose purpose
    ) {
        CaptchaPurpose captchaPurpose = purpose == OtpCodePurpose.PASSWORD_RESET
            ? CaptchaPurpose.PASSWORD_RESET
            : CaptchaPurpose.REGISTER;

        if (verificationToken != null && !verificationToken.isBlank()) {
            return verificationTokenStore.validateUnused(
                verificationToken,
                captchaPurpose.name()
            );
        }
        return request.isChallengePassed();
    }

    private void enforceResendCooldown(String email, OtpCodePurpose purpose) {
        Optional<OtpVerificationCode> latestCode = otpVerificationCodeRepository
            .findTopByEmailAndPurposeOrderByCreatedAtDesc(email, purpose.name());
        if (latestCode.isEmpty()) {
            return;
        }

        LocalDateTime allowedAt = latestCode.get().getCreatedAt().plusSeconds(resendCooldownSeconds);
        if (allowedAt.isAfter(LocalDateTime.now())) {
            throw new BadRequestException("Bạn thao tác quá nhanh, vui lòng thử lại sau");
        }
    }

    private void logChallenge(String email, boolean passed, String type, String response) {
        try {
            OtpChallenge challenge = new OtpChallenge();
            challenge.setEmail(email);
            challenge.setChallengeType(type);
            challenge.setChallengePayload("{\"mode\":\"anti-bot\"}");
            challenge.setChallengeResponse(response);
            challenge.setPassed(passed);
            otpChallengeRepository.save(challenge);
        } catch (Exception ex) {
            // Audit log is best-effort; OTP delivery must continue.
        }
    }

    private String generateSixDigitCode() {
        return String.format("%06d", ThreadLocalRandom.current().nextInt(0, 1_000_000));
    }

    private String hash(String raw) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashed);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 algorithm unavailable", ex);
        }
    }
}
