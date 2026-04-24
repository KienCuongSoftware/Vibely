package com.vibely.backend.auth;

import com.vibely.backend.common.BadRequestException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.Optional;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class OtpVerificationService {

    private final OtpChallengeRepository otpChallengeRepository;
    private final OtpVerificationCodeRepository otpVerificationCodeRepository;
    private final int resendCooldownSeconds;
    private final int codeExpirySeconds;

    public OtpVerificationService(
        OtpChallengeRepository otpChallengeRepository,
        OtpVerificationCodeRepository otpVerificationCodeRepository,
        @Value("${app.auth.otp-resend-seconds:60}") int resendCooldownSeconds,
        @Value("${app.auth.otp-expiry-seconds:600}") int codeExpirySeconds
    ) {
        this.otpChallengeRepository = otpChallengeRepository;
        this.otpVerificationCodeRepository = otpVerificationCodeRepository;
        this.resendCooldownSeconds = resendCooldownSeconds;
        this.codeExpirySeconds = codeExpirySeconds;
    }

    public SendCodeResponse sendCode(SendCodeRequest request) {
        String email = request.getEmail().trim().toLowerCase();

        if (!request.isChallengePassed()) {
            logChallenge(email, false, "shape-match", "challengePassed=false");
            throw new BadRequestException("Xác minh chống spam thất bại, vui lòng thử lại");
        }

        enforceResendCooldown(email);
        String code = generateSixDigitCode();
        logChallenge(email, true, "shape-match", "challengePassed=true");

        OtpVerificationCode otpCode = new OtpVerificationCode();
        otpCode.setEmail(email);
        otpCode.setCodeHash(hash(code));
        otpCode.setExpiresAt(LocalDateTime.now().plusSeconds(codeExpirySeconds));
        otpCode.setConsumed(false);
        otpVerificationCodeRepository.save(otpCode);
        otpVerificationCodeRepository.deleteByExpiresAtBefore(LocalDateTime.now().minusDays(1));

        return new SendCodeResponse(resendCooldownSeconds, codeExpirySeconds, code);
    }

    public VerifyCodeResponse verifyCode(VerifyCodeRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        OtpVerificationCode otpCode = otpVerificationCodeRepository
            .findTopByEmailAndConsumedFalseOrderByCreatedAtDesc(email)
            .orElseThrow(() -> new BadRequestException("Mã xác minh không hợp lệ"));

        if (otpCode.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("Mã xác minh đã hết hạn");
        }

        if (!otpCode.getCodeHash().equals(hash(request.getCode().trim()))) {
            throw new BadRequestException("Mã xác minh không chính xác");
        }

        otpCode.setConsumed(true);
        return new VerifyCodeResponse(true);
    }

    private void enforceResendCooldown(String email) {
        Optional<OtpVerificationCode> latestCode = otpVerificationCodeRepository.findTopByEmailOrderByCreatedAtDesc(email);
        if (latestCode.isEmpty()) {
            return;
        }

        LocalDateTime allowedAt = latestCode.get().getCreatedAt().plusSeconds(resendCooldownSeconds);
        if (allowedAt.isAfter(LocalDateTime.now())) {
            throw new BadRequestException("Bạn thao tác quá nhanh, vui lòng thử lại sau");
        }
    }

    private void logChallenge(String email, boolean passed, String type, String response) {
        OtpChallenge challenge = new OtpChallenge();
        challenge.setEmail(email);
        challenge.setChallengeType(type);
        challenge.setChallengePayload("{\"mode\":\"shape-match\"}");
        challenge.setChallengeResponse(response);
        challenge.setPassed(passed);
        otpChallengeRepository.save(challenge);
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
