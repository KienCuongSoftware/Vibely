package com.vibely.backend.antibot.auth;

import com.vibely.backend.antibot.config.AntiBotProperties;
import com.vibely.backend.antibot.domain.CaptchaPurpose;
import com.vibely.backend.antibot.domain.ChallengeLevel;
import com.vibely.backend.antibot.dto.RiskEvaluateRequest;
import com.vibely.backend.antibot.dto.RiskEvaluateResponse;
import com.vibely.backend.antibot.exception.CaptchaRequiredException;
import com.vibely.backend.antibot.exception.SuspiciousLoginException;
import com.vibely.backend.antibot.reputation.IpReputationService;
import com.vibely.backend.antibot.risk.RiskEngine;
import com.vibely.backend.antibot.security.VerificationTokenStore;
import com.vibely.backend.antibot.telemetry.AntiBotTelemetryPublisher;
import com.vibely.backend.common.BadRequestException;
import jakarta.servlet.http.HttpServletRequest;
import java.util.HashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class AuthProtectionService {

    private static final Logger log = LoggerFactory.getLogger(AuthProtectionService.class);

    public static final String CAPTCHA_VERIFICATION_HEADER = "X-Captcha-Verification";

    private final AntiBotProperties properties;
    private final RiskEngine riskEngine;
    private final VerificationTokenStore verificationTokenStore;
    private final LoginAttemptTracker loginAttemptTracker;
    private final IpReputationService ipReputationService;
    private final AntiBotTelemetryPublisher telemetryPublisher;

    public AuthProtectionService(
        AntiBotProperties properties,
        RiskEngine riskEngine,
        VerificationTokenStore verificationTokenStore,
        LoginAttemptTracker loginAttemptTracker,
        IpReputationService ipReputationService,
        AntiBotTelemetryPublisher telemetryPublisher
    ) {
        this.properties = properties;
        this.riskEngine = riskEngine;
        this.verificationTokenStore = verificationTokenStore;
        this.loginAttemptTracker = loginAttemptTracker;
        this.ipReputationService = ipReputationService;
        this.telemetryPublisher = telemetryPublisher;
    }

    public void guardLogin(
        String email,
        String verificationToken,
        String sessionId,
        String deviceHash,
        HttpServletRequest request
    ) {
        guardAuthAction(
            CaptchaPurpose.LOGIN,
            email,
            verificationToken,
            sessionId,
            deviceHash,
            request,
            true,
            false
        );
    }

    public void guardRegister(
        String email,
        String verificationToken,
        String sessionId,
        String deviceHash,
        HttpServletRequest request
    ) {
        guardAuthAction(
            CaptchaPurpose.REGISTER,
            email,
            verificationToken,
            sessionId,
            deviceHash,
            request,
            false,
            false
        );
    }

    /** Gọi sau khi đăng nhập thành công — token chỉ dùng một lần. */
    public void consumeLoginVerification(HttpServletRequest request) {
        if (!properties.isEnabled() || !properties.isAuthProtectionEnabled()) {
            return;
        }
        String verificationToken = request.getHeader(CAPTCHA_VERIFICATION_HEADER);
        if (verificationToken == null || verificationToken.isBlank()) {
            return;
        }
        verificationTokenStore.consume(verificationToken, CaptchaPurpose.LOGIN.name());
    }

    /** Gọi sau khi tạo tài khoản thành công — token chỉ dùng một lần. */
    public void consumeRegisterVerification(HttpServletRequest request) {
        if (!properties.isEnabled() || !properties.isAuthProtectionEnabled()) {
            return;
        }
        String verificationToken = request.getHeader(CAPTCHA_VERIFICATION_HEADER);
        if (verificationToken == null || verificationToken.isBlank()) {
            return;
        }
        verificationTokenStore.consume(verificationToken, CaptchaPurpose.REGISTER.name());
    }

    public void onLoginFailure(String email, HttpServletRequest request) {
        try {
            String ip = clientIp(request);
            loginAttemptTracker.recordFailure(ip, email);
            ipReputationService.penalize(ip, 4);
            telemetryPublisher.publish("login-events", Map.of(
                "event", "login_failed",
                "emailHash", hash(email),
                "ipHash", hash(ip)
            ));
        } catch (Exception ex) {
            log.warn("Login failure telemetry skipped: {}", ex.toString());
        }
    }

    public void onLoginSuccess(String email, HttpServletRequest request) {
        try {
            String ip = clientIp(request);
            loginAttemptTracker.recordSuccess(ip, email);
            telemetryPublisher.publish("login-events", Map.of(
                "event", "login_success",
                "emailHash", hash(email),
                "ipHash", hash(ip)
            ));
        } catch (Exception ex) {
            log.warn("Login success telemetry skipped: {}", ex.toString());
        }
    }

    public void onRegisterSuccess(String email, HttpServletRequest request) {
        try {
            telemetryPublisher.publish("login-events", Map.of(
                "event", "register_success",
                "emailHash", hash(email),
                "ipHash", hash(clientIp(request))
            ));
        } catch (Exception ex) {
            log.warn("Register success telemetry skipped: {}", ex.toString());
        }
    }

    private void guardAuthAction(
        CaptchaPurpose purpose,
        String email,
        String verificationToken,
        String sessionId,
        String deviceHash,
        HttpServletRequest request,
        boolean loginFlow,
        boolean consumeToken
    ) {
        if (!properties.isEnabled() || !properties.isAuthProtectionEnabled()) {
            return;
        }

        try {
            String ip = clientIp(request);
            if (loginAttemptTracker.isBlocked(ip, email)) {
                telemetryPublisher.publish("abuse-events", Map.of(
                    "event", "login_blocked",
                    "emailHash", hash(email),
                    "ipHash", hash(ip)
                ));
                throw new SuspiciousLoginException(
                    "Tài khoản hoặc IP tạm thời bị khóa do nhiều lần đăng nhập thất bại"
                );
            }

            ChallengeLevel required = resolveRequiredChallenge(
                purpose,
                email,
                sessionId,
                deviceHash,
                request,
                loginFlow
            );

            if (required == ChallengeLevel.NONE) {
                return;
            }

            if (verificationToken == null || verificationToken.isBlank()) {
                throw new CaptchaRequiredException(
                    required,
                    estimateRiskScore(email, sessionId, deviceHash, request, purpose)
                );
            }

            boolean valid = consumeToken
                ? verificationTokenStore.consume(verificationToken, purpose.name())
                : verificationTokenStore.validateUnused(verificationToken, purpose.name());
            if (!valid) {
                throw new BadRequestException("Captcha verification không hợp lệ hoặc đã được sử dụng");
            }
        } catch (CaptchaRequiredException | SuspiciousLoginException | BadRequestException ex) {
            throw ex;
        } catch (Exception ex) {
            // Redis/DB outage must not block mobile login with HTTP 500.
            log.warn("Auth protection degraded for {}: {}", purpose, ex.toString());
        }
    }

    private ChallengeLevel resolveRequiredChallenge(
        CaptchaPurpose purpose,
        String email,
        String sessionId,
        String deviceHash,
        HttpServletRequest request,
        boolean loginFlow
    ) {
        int failures = loginFlow ? loginAttemptTracker.recentFailuresByEmail(email) : 0;
        ChallengeLevel escalated = escalateFromFailures(failures);

        if (purpose == CaptchaPurpose.REGISTER) {
            escalated = maxLevel(escalated, ChallengeLevel.CHECKBOX);
        }

        int ipRep = safeIpReputation(request);
        if (ipRep < 40) {
            escalated = maxLevel(escalated, ChallengeLevel.ROTATE);
        }

        RiskEvaluateResponse risk = safeRiskEvaluate(
            purpose,
            email,
            sessionId,
            deviceHash,
            request
        );

        ChallengeLevel fromRisk = risk.challengeLevel();
        ChallengeLevel merged = maxLevel(escalated, fromRisk);

        if (risk.deviceTrustScore() >= properties.getCaptchaBypassTrustThreshold()
            && risk.sessionTrustScore() >= properties.getCaptchaBypassTrustThreshold()
            && failures == 0
            && ipRep >= 65
            && merged.ordinal() <= ChallengeLevel.CHECKBOX.ordinal()) {
            return ChallengeLevel.NONE;
        }

        if (properties.isAlwaysRequireCaptchaOnAuth()) {
            merged = maxLevel(merged, ChallengeLevel.CHECKBOX);
        }

        return merged;
    }

    private int safeIpReputation(HttpServletRequest request) {
        try {
            return ipReputationService.score(request);
        } catch (Exception ex) {
            log.warn("IP reputation check failed: {}", ex.toString());
            return 60;
        }
    }

    private RiskEvaluateResponse safeRiskEvaluate(
        CaptchaPurpose purpose,
        String email,
        String sessionId,
        String deviceHash,
        HttpServletRequest request
    ) {
        try {
            return riskEngine.evaluate(
                new RiskEvaluateRequest(
                    sessionId == null ? "auth-" + hash(email) : sessionId,
                    purpose.name().toLowerCase(),
                    deviceHash,
                    null,
                    null,
                    buildContext(email, deviceHash)
                ),
                request
            );
        } catch (Exception ex) {
            log.warn("Risk evaluation failed: {}", ex.toString());
            return new RiskEvaluateResponse(
                0,
                com.vibely.backend.antibot.domain.RiskLevel.LOW,
                ChallengeLevel.NONE,
                false,
                null,
                properties.getDefaultTrustScore(),
                properties.getDefaultTrustScore(),
                60,
                java.util.List.of()
            );
        }
    }

    private int estimateRiskScore(
        String email,
        String sessionId,
        String deviceHash,
        HttpServletRequest request,
        CaptchaPurpose purpose
    ) {
        return safeRiskEvaluate(purpose, email, sessionId, deviceHash, request).riskScore();
    }

    private Map<String, Object> buildContext(String email, String deviceHash) {
        Map<String, Object> context = new HashMap<>();
        context.put("emailHash", hash(email));
        if (deviceHash != null) {
            context.put("deviceHash", deviceHash);
        }
        return context;
    }

    private ChallengeLevel escalateFromFailures(int failures) {
        if (failures >= properties.getExtremeFailureThreshold()) {
            return ChallengeLevel.MULTI_STEP;
        }
        if (failures >= properties.getHighFailureThreshold()) {
            return ChallengeLevel.SLIDER;
        }
        if (failures >= properties.getMediumFailureThreshold()) {
            return ChallengeLevel.ROTATE;
        }
        if (failures >= properties.getLowFailureThreshold()) {
            return ChallengeLevel.CHECKBOX;
        }
        return ChallengeLevel.NONE;
    }

    private ChallengeLevel maxLevel(ChallengeLevel a, ChallengeLevel b) {
        return a.ordinal() >= b.ordinal() ? a : b;
    }

    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private String hash(String value) {
        return com.vibely.backend.antibot.security.AntiBotHashing.sha256Hex(
            value == null ? "unknown" : value.trim().toLowerCase()
        );
    }
}
