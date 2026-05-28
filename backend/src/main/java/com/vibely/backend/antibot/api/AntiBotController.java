package com.vibely.backend.antibot.api;

import com.vibely.backend.antibot.captcha.CaptchaService;
import com.vibely.backend.antibot.config.AntiBotProperties;
import com.vibely.backend.antibot.domain.ChallengeLevel;
import com.vibely.backend.antibot.dto.BehaviorTrackRequest;
import com.vibely.backend.antibot.dto.BehaviorTrackResponse;
import com.vibely.backend.antibot.dto.CaptchaChallengeResponse;
import com.vibely.backend.antibot.dto.CaptchaVerifyRequest;
import com.vibely.backend.antibot.dto.CaptchaVerifyResponse;
import com.vibely.backend.antibot.dto.FingerprintRegisterRequest;
import com.vibely.backend.antibot.dto.FingerprintRegisterResponse;
import com.vibely.backend.antibot.dto.RiskEvaluateRequest;
import com.vibely.backend.antibot.dto.RiskEvaluateResponse;
import com.vibely.backend.antibot.dto.TrustEvaluateRequest;
import com.vibely.backend.antibot.dto.TrustEvaluateResponse;
import com.vibely.backend.antibot.behavior.BehaviorAnalysisService;
import com.vibely.backend.antibot.fingerprint.FingerprintService;
import com.vibely.backend.antibot.risk.RiskEngine;
import com.vibely.backend.antibot.trust.TrustScoringService;
import com.vibely.backend.common.ApiResponse;
import com.vibely.backend.common.BadRequestException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class AntiBotController {

    private final AntiBotProperties properties;
    private final RiskEngine riskEngine;
    private final CaptchaService captchaService;
    private final FingerprintService fingerprintService;
    private final BehaviorAnalysisService behaviorAnalysisService;
    private final TrustScoringService trustScoringService;

    public AntiBotController(
        AntiBotProperties properties,
        RiskEngine riskEngine,
        CaptchaService captchaService,
        FingerprintService fingerprintService,
        BehaviorAnalysisService behaviorAnalysisService,
        TrustScoringService trustScoringService
    ) {
        this.properties = properties;
        this.riskEngine = riskEngine;
        this.captchaService = captchaService;
        this.fingerprintService = fingerprintService;
        this.behaviorAnalysisService = behaviorAnalysisService;
        this.trustScoringService = trustScoringService;
    }

    @PostMapping("/risk/evaluate")
    public ApiResponse<RiskEvaluateResponse> evaluateRisk(
        @Valid @RequestBody RiskEvaluateRequest request,
        HttpServletRequest httpRequest
    ) {
        ensureEnabled();
        return ApiResponse.success(riskEngine.evaluate(request, httpRequest));
    }

    @GetMapping("/captcha/challenge")
    public ApiResponse<CaptchaChallengeResponse> challenge(
        @RequestParam(defaultValue = "ROTATE") String level,
        @RequestParam(required = false) String deviceHash,
        HttpServletRequest httpRequest
    ) {
        ensureEnabled();
        ChallengeLevel challengeLevel = parseChallengeLevel(level);
        return ApiResponse.success(captchaService.createChallenge(challengeLevel, deviceHash, httpRequest));
    }

    @PostMapping("/captcha/verify")
    public ApiResponse<CaptchaVerifyResponse> verifyCaptcha(
        @Valid @RequestBody CaptchaVerifyRequest request,
        HttpServletRequest httpRequest
    ) {
        ensureEnabled();
        CaptchaVerifyResponse response = captchaService.verify(request, httpRequest);
        if (response.verified()) {
            trustScoringService.recordCaptchaSuccess(request.deviceHash(), null);
        } else {
            trustScoringService.recordCaptchaFailure(request.deviceHash(), null);
        }
        return ApiResponse.success(response);
    }

    @PostMapping("/fingerprint/register")
    public ApiResponse<FingerprintRegisterResponse> registerFingerprint(
        @Valid @RequestBody FingerprintRegisterRequest request
    ) {
        ensureEnabled();
        return ApiResponse.success(fingerprintService.register(request));
    }

    @PostMapping("/behavior/track")
    public ApiResponse<BehaviorTrackResponse> trackBehavior(
        @Valid @RequestBody BehaviorTrackRequest request
    ) {
        ensureEnabled();
        return ApiResponse.success(
            behaviorAnalysisService.track(request.sessionId(), request.deviceHash(), request.samples())
        );
    }

    @PostMapping("/trust/evaluate")
    public ApiResponse<TrustEvaluateResponse> evaluateTrust(
        @Valid @RequestBody TrustEvaluateRequest request
    ) {
        ensureEnabled();
        return ApiResponse.success(trustScoringService.evaluate(request));
    }

    private ChallengeLevel parseChallengeLevel(String level) {
        try {
            return ChallengeLevel.valueOf(level.toUpperCase());
        } catch (IllegalArgumentException ex) {
            return ChallengeLevel.ROTATE;
        }
    }

    private void ensureEnabled() {
        if (!properties.isEnabled()) {
            throw new BadRequestException("Anti-bot platform is disabled");
        }
    }
}
