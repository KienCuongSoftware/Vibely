package com.vibely.backend.antibot.risk;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vibely.backend.antibot.config.AntiBotProperties;
import com.vibely.backend.antibot.domain.ChallengeLevel;
import com.vibely.backend.antibot.domain.RiskLevel;
import com.vibely.backend.antibot.dto.AutomationSignals;
import com.vibely.backend.antibot.dto.RiskEvaluateRequest;
import com.vibely.backend.antibot.dto.RiskEvaluateResponse;
import com.vibely.backend.antibot.fingerprint.FingerprintService;
import com.vibely.backend.antibot.reputation.IpReputationService;
import com.vibely.backend.antibot.persistence.AntiBotRiskEventRepository;
import com.vibely.backend.antibot.persistence.entity.AntiBotRiskEventEntity;
import com.vibely.backend.antibot.ratelimit.AntiBotRateLimitService;
import com.vibely.backend.antibot.security.AntiBotHashing;
import com.vibely.backend.antibot.security.AntiBotTokenSigner;
import com.vibely.backend.antibot.telemetry.AntiBotTelemetryPublisher;
import com.vibely.backend.antibot.trust.TrustScoringService;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RiskEngine {

    private final AntiBotProperties properties;
    private final FingerprintService fingerprintService;
    private final TrustScoringService trustScoringService;
    private final AntiBotRateLimitService rateLimitService;
    private final AntiBotTokenSigner tokenSigner;
    private final AntiBotRiskEventRepository riskEventRepository;
    private final ObjectMapper objectMapper;
    private final AntiBotTelemetryPublisher telemetryPublisher;
    private final IpReputationService ipReputationService;

    public RiskEngine(
        AntiBotProperties properties,
        FingerprintService fingerprintService,
        TrustScoringService trustScoringService,
        AntiBotRateLimitService rateLimitService,
        AntiBotTokenSigner tokenSigner,
        AntiBotRiskEventRepository riskEventRepository,
        ObjectMapper objectMapper,
        AntiBotTelemetryPublisher telemetryPublisher,
        IpReputationService ipReputationService
    ) {
        this.properties = properties;
        this.fingerprintService = fingerprintService;
        this.trustScoringService = trustScoringService;
        this.rateLimitService = rateLimitService;
        this.tokenSigner = tokenSigner;
        this.riskEventRepository = riskEventRepository;
        this.objectMapper = objectMapper;
        this.telemetryPublisher = telemetryPublisher;
        this.ipReputationService = ipReputationService;
    }

    @Transactional
    public RiskEvaluateResponse evaluate(RiskEvaluateRequest request, HttpServletRequest httpRequest) {
        // Local/E2E: frontend ensureHuman() calls this before login. When auth protection is off,
        // never require a captcha challenge (Selenium would otherwise get stuck on the slider).
        if (!properties.isAuthProtectionEnabled()) {
            int trust = properties.getDefaultTrustScore();
            return new RiskEvaluateResponse(
                0,
                RiskLevel.LOW,
                ChallengeLevel.NONE,
                false,
                null,
                trust,
                trust,
                100,
                List.of("auth_protection_disabled")
            );
        }

        List<String> signals = new ArrayList<>();
        int score = 0;

        String ip = clientIp(httpRequest);
        String ipHash = AntiBotHashing.sha256Hex(ip);
        String deviceHash = request.deviceHash();
        if (deviceHash == null && request.fingerprint() != null) {
            deviceHash = fingerprintService.hashFingerprint(request.fingerprint(), request.automation());
        }

        int deviceTrust = fingerprintService.getDeviceTrustScore(deviceHash);
        int userTrust = trustScoringService.getUserTrustScore(
            request.context() == null ? null : String.valueOf(request.context().get("userId"))
        );
        int ipReputation = ipReputationService.score(httpRequest);
        if (ipReputation < 45) {
            signals.add("low_ip_reputation");
        }

        score += Math.max(0, 70 - deviceTrust) / 3;
        score += Math.max(0, 70 - userTrust) / 4;
        score += Math.max(0, 60 - ipReputation) / 2;

        if (!rateLimitService.allow("risk-eval", ipHash, 120)) {
            score += 25;
            signals.add("velocity_ip");
        }
        if (deviceHash != null && !rateLimitService.allow("risk-eval-device", deviceHash, 180)) {
            score += 15;
            signals.add("velocity_device");
        }

        score += automationScore(request.automation(), signals);
        if (ipReputation < 35) {
            score += 12;
        }

        if ("login".equalsIgnoreCase(request.action()) || "register".equalsIgnoreCase(request.action())) {
            score += 8;
        }

        score = Math.max(0, Math.min(100, score));
        RiskLevel riskLevel = RiskLevel.fromScore(score);
        ChallengeLevel challengeLevel = ChallengeLevel.fromRiskLevel(riskLevel);

        if (userTrust >= 80 && deviceTrust >= 75 && score < 50) {
            challengeLevel = ChallengeLevel.NONE;
            riskLevel = RiskLevel.LOW;
            score = Math.min(score, 24);
        }

        boolean challengeRequired = challengeLevel != ChallengeLevel.NONE;
        String challengeToken = null;
        if (challengeRequired) {
            long expires = Instant.now().plusSeconds(properties.getCaptchaTtlSeconds()).toEpochMilli();
            challengeToken = tokenSigner.challengeToken(request.sessionId(), expires);
        }

        persistRiskEvent(request, deviceHash, ipHash, score, riskLevel, challengeLevel, signals);
        try {
            telemetryPublisher.publish("risk-events", Map.of(
                "event", "risk_evaluated",
                "sessionId", request.sessionId(),
                "score", score,
                "level", riskLevel.name()
            ));
        } catch (Exception ex) {
            // Telemetry must not break auth flows.
        }

        return new RiskEvaluateResponse(
            score,
            riskLevel,
            challengeLevel,
            challengeRequired,
            challengeToken,
            userTrust,
            deviceTrust,
            ipReputation,
            signals
        );
    }

    private int automationScore(AutomationSignals automation, List<String> signals) {
        if (automation == null) {
            return 0;
        }
        int score = 0;
        if (automation.webdriver()) {
            score += 35;
            signals.add("webdriver");
        }
        if (automation.seleniumGlobals()) {
            score += 30;
            signals.add("selenium");
        }
        if (automation.puppeteerTrace()) {
            score += 28;
            signals.add("puppeteer");
        }
        if (automation.playwrightTrace()) {
            score += 28;
            signals.add("playwright");
        }
        if (automation.headlessHints()) {
            score += 20;
            signals.add("headless");
        }
        if (automation.suspiciousWebGl()) {
            score += 12;
            signals.add("webgl");
        }
        if (automation.timingVariance() < 0.05) {
            score += 10;
            signals.add("timing_robotic");
        }
        return score;
    }

    private void persistRiskEvent(
        RiskEvaluateRequest request,
        String deviceHash,
        String ipHash,
        int score,
        RiskLevel riskLevel,
        ChallengeLevel challengeLevel,
        List<String> signals
    ) {
        AntiBotRiskEventEntity entity = new AntiBotRiskEventEntity();
        entity.setSessionId(request.sessionId());
        entity.setDeviceHash(deviceHash);
        entity.setIpHash(ipHash);
        entity.setAction(request.action() == null ? "generic" : request.action());
        entity.setRiskScore(score);
        entity.setRiskLevel(riskLevel.name());
        entity.setChallengeLevel(challengeLevel.name());
        try {
            entity.setSignalsJson(objectMapper.writeValueAsString(signals));
        } catch (JsonProcessingException ex) {
            entity.setSignalsJson("[]");
        }
        if (request.context() != null && request.context().get("userId") instanceof Number number) {
            entity.setUserId(number.longValue());
        }
        try {
            riskEventRepository.save(entity);
        } catch (Exception ex) {
            // Risk audit persistence must not break login/register.
        }
    }

    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
