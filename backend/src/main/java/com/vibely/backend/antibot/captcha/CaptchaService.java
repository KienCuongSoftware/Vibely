package com.vibely.backend.antibot.captcha;

import com.github.f4b6a3.uuid.UuidCreator;
import com.vibely.backend.antibot.behavior.BehaviorAnalysisService;
import com.vibely.backend.antibot.config.AntiBotProperties;
import com.vibely.backend.antibot.domain.CaptchaPurpose;
import com.vibely.backend.antibot.domain.CaptchaType;
import com.vibely.backend.antibot.domain.ChallengeLevel;
import com.vibely.backend.antibot.dto.CaptchaChallengeResponse;
import com.vibely.backend.antibot.dto.CaptchaVerifyRequest;
import com.vibely.backend.antibot.dto.CaptchaVerifyResponse;
import com.vibely.backend.antibot.persistence.AntiBotCaptchaSessionRepository;
import com.vibely.backend.antibot.persistence.entity.AntiBotCaptchaSessionEntity;
import com.vibely.backend.antibot.security.AntiBotHashing;
import com.vibely.backend.antibot.security.AntiBotTokenSigner;
import com.vibely.backend.antibot.telemetry.AntiBotTelemetryPublisher;
import com.vibely.backend.common.BadRequestException;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CaptchaService {

    private final AntiBotProperties properties;
    private final CaptchaSessionStore sessionStore;
    private final RotateCaptchaImageGenerator rotateImageGenerator;
    private final SliderCaptchaImageGenerator sliderImageGenerator;
    private final AntiBotTokenSigner tokenSigner;
    private final BehaviorAnalysisService behaviorAnalysisService;
    private final AntiBotCaptchaSessionRepository captchaSessionRepository;
    private final AntiBotTelemetryPublisher telemetryPublisher;

    public CaptchaService(
        AntiBotProperties properties,
        CaptchaSessionStore sessionStore,
        RotateCaptchaImageGenerator rotateImageGenerator,
        SliderCaptchaImageGenerator sliderImageGenerator,
        AntiBotTokenSigner tokenSigner,
        BehaviorAnalysisService behaviorAnalysisService,
        AntiBotCaptchaSessionRepository captchaSessionRepository,
        AntiBotTelemetryPublisher telemetryPublisher
    ) {
        this.properties = properties;
        this.sessionStore = sessionStore;
        this.rotateImageGenerator = rotateImageGenerator;
        this.sliderImageGenerator = sliderImageGenerator;
        this.tokenSigner = tokenSigner;
        this.behaviorAnalysisService = behaviorAnalysisService;
        this.captchaSessionRepository = captchaSessionRepository;
        this.telemetryPublisher = telemetryPublisher;
    }

    public CaptchaChallengeResponse createChallenge(
        ChallengeLevel challengeLevel,
        String deviceHash,
        HttpServletRequest request
    ) {
        CaptchaType type = mapChallengeType(challengeLevel);
        boolean multiStep = challengeLevel == ChallengeLevel.MULTI_STEP;
        String challengeId = UuidCreator.getTimeOrderedEpoch().toString().replace("-", "");
        Instant now = Instant.now();
        Instant expiresAt = now.plusSeconds(properties.getCaptchaTtlSeconds());
        long expiresMs = expiresAt.toEpochMilli();
        String ipHash = AntiBotHashing.sha256Hex(clientIp(request));

        int correctAngle = 0;
        int displayRotation = 0;
        String imageBase64 = null;
        String puzzleBase64 = null;
        Integer sliderTargetX = null;

        if (type == CaptchaType.SLIDER) {
            SliderCaptchaImageGenerator.SliderPuzzle puzzle = sliderImageGenerator.generate(System.nanoTime());
            imageBase64 = puzzle.backgroundBase64();
            puzzleBase64 = puzzle.puzzleBase64();
            sliderTargetX = puzzle.targetX();
            displayRotation = puzzle.targetY();
        } else if (type == CaptchaType.CHECKBOX) {
            imageBase64 = rotateImageGenerator.generateBase64(System.nanoTime());
        } else {
            long seed = System.nanoTime();
            correctAngle = rotateImageGenerator.randomCorrectAngle();
            displayRotation = rotateImageGenerator.randomDisplayRotation(correctAngle);
            RotateCaptchaImageGenerator.RotateLayers layers = rotateImageGenerator.generateRotateLayers(
                seed,
                correctAngle,
                displayRotation
            );
            imageBase64 = layers.outerRingBase64();
            puzzleBase64 = layers.innerDiscBase64();
        }

        CaptchaSession session = new CaptchaSession(
            challengeId,
            type,
            correctAngle,
            displayRotation,
            imageBase64,
            puzzleBase64,
            sliderTargetX,
            deviceHash,
            ipHash,
            now,
            expiresAt,
            false,
            0,
            multiStep
        );
        sessionStore.save(session);
        persistAudit(session);

        String signedToken = tokenSigner.challengeToken(challengeId, expiresMs);
        telemetryPublisher.publish("captcha-events", Map.of(
            "event", "challenge_created",
            "challengeId", challengeId,
            "type", type.name(),
            "multiStep", multiStep
        ));

        int sliderMax = type == CaptchaType.SLIDER
            ? SliderCaptchaImageGenerator.WIDTH - SliderCaptchaImageGenerator.PIECE_SIZE
            : 360;

        return new CaptchaChallengeResponse(
            challengeId,
            type,
            imageBase64,
            puzzleBase64,
            displayRotation,
            sliderMax,
            expiresMs,
            signedToken,
            multiStep
        );
    }

    @Transactional
    public CaptchaVerifyResponse verify(CaptchaVerifyRequest request, HttpServletRequest httpRequest) {
        if (!tokenSigner.verifyChallengeToken(
            request.challengeId(),
            sessionExpiresMs(request),
            request.signedToken()
        )) {
            throw new BadRequestException("Captcha token không hợp lệ hoặc đã hết hạn");
        }

        CaptchaSession session = sessionStore.find(request.challengeId())
            .orElseThrow(() -> new BadRequestException("Captcha không tồn tại hoặc đã hết hạn"));

        if (session.consumed()) {
            throw new BadRequestException("Captcha đã được sử dụng");
        }
        if (session.attempts() >= 5) {
            throw new BadRequestException("Vượt quá số lần thử captcha");
        }

        validateSolveDuration(request);

        double behaviorConfidence = analyzeBehavior(request, session.type());

        boolean verified = switch (session.type()) {
            case CHECKBOX -> Boolean.TRUE.equals(request.checkboxAttested());
            case ROTATE -> verifyRotateSession(session, request);
            case SLIDER -> verifySlider(session, request.sliderOffset());
            case GESTURE -> false;
        };

        if (!verified) {
            sessionStore.incrementAttempts(request.challengeId());
            markSolvedAudit(request.challengeId(), false);
            telemetryPublisher.publish("captcha-events", Map.of(
                "event", "verify_failed",
                "challengeId", request.challengeId(),
                "type", session.type().name()
            ));
            return new CaptchaVerifyResponse(false, null, 0, behaviorConfidence);
        }

        if (!sessionStore.consume(request.challengeId())) {
            throw new BadRequestException("Captcha đã được sử dụng");
        }

        String purpose = request.purpose() == null
            ? CaptchaPurpose.GENERIC.name()
            : request.purpose().name();
        long verificationExpires = Instant.now()
            .plusSeconds(properties.getVerificationTokenTtlSeconds())
            .toEpochMilli();
        String verificationToken = tokenSigner.verificationToken(
            purpose,
            request.challengeId(),
            verificationExpires
        );
        markSolvedAudit(request.challengeId(), true);

        telemetryPublisher.publish("captcha-events", Map.of(
            "event", "verify_success",
            "challengeId", request.challengeId(),
            "purpose", purpose
        ));

        return new CaptchaVerifyResponse(true, verificationToken, verificationExpires, behaviorConfidence);
    }

    private boolean verifyRotateSession(CaptchaSession session, CaptchaVerifyRequest request) {
        boolean rotateOk = verifyRotation(session, request.rotation());
        if (!session.multiStep()) {
            return rotateOk;
        }
        return rotateOk && Boolean.TRUE.equals(request.checkboxAttested());
    }

    private void validateSolveDuration(CaptchaVerifyRequest request) {
        Long solveDuration = request.solveDurationMs();
        if (solveDuration == null) {
            return;
        }
        if (solveDuration < properties.getMinSolveTimeMs()) {
            sessionStore.incrementAttempts(request.challengeId());
            telemetryPublisher.publish("captcha-events", Map.of(
                "event", "verify_failed",
                "reason", "instant_solve",
                "challengeId", request.challengeId()
            ));
            throw new BadRequestException("Hoàn thành captcha quá nhanh");
        }
        if (solveDuration > properties.getMaxSolveTimeMs()) {
            throw new BadRequestException("Captcha đã hết hạn");
        }
    }

    private double analyzeBehavior(CaptchaVerifyRequest request, CaptchaType captchaType) {
        if (request.behaviorSamples() == null || request.behaviorSamples().isEmpty()) {
            return 1.0;
        }
        // Slider/rotate puzzles use a 1-D range control — linear pointer paths are expected.
        if (captchaType == CaptchaType.SLIDER || captchaType == CaptchaType.ROTATE) {
            return 0.8;
        }
        var behavior = behaviorAnalysisService.analyze(request.behaviorSamples());
        if (behavior.suspicious()) {
            sessionStore.incrementAttempts(request.challengeId());
            throw new BadRequestException("Hành vi không giống người dùng thật");
        }
        return behavior.behaviorConfidence();
    }

    private boolean verifyRotation(CaptchaSession session, Integer submittedRotation) {
        if (submittedRotation == null) {
            return false;
        }
        int absoluteRotation = normalize(session.displayRotation() + submittedRotation);
        int delta = Math.abs(absoluteRotation - normalize(session.correctAngle()));
        delta = Math.min(delta, 360 - delta);
        return delta <= properties.getRotateToleranceDegrees();
    }

    private boolean verifySlider(CaptchaSession session, Integer sliderOffset) {
        if (sliderOffset == null || session.sliderTargetX() == null) {
            return false;
        }
        return Math.abs(sliderOffset - session.sliderTargetX()) <= properties.getSliderTolerancePx();
    }

    private int normalize(int angle) {
        int mod = angle % 360;
        return mod < 0 ? mod + 360 : mod;
    }

    private CaptchaType mapChallengeType(ChallengeLevel level) {
        return switch (level) {
            case NONE, CHECKBOX -> CaptchaType.CHECKBOX;
            case ROTATE, MULTI_STEP -> CaptchaType.ROTATE;
            case SLIDER -> CaptchaType.SLIDER;
        };
    }

    private long sessionExpiresMs(CaptchaVerifyRequest request) {
        return sessionStore.find(request.challengeId())
            .map(s -> s.expiresAt().toEpochMilli())
            .orElse(Instant.now().toEpochMilli());
    }

    private void persistAudit(CaptchaSession session) {
        AntiBotCaptchaSessionEntity entity = new AntiBotCaptchaSessionEntity();
        entity.setChallengeId(session.challengeId());
        entity.setChallengeType(session.type().name());
        entity.setDeviceHash(session.deviceHash());
        entity.setIpHash(session.ipHash());
        entity.setExpiresAt(session.expiresAt());
        captchaSessionRepository.save(entity);
    }

    private void markSolvedAudit(String challengeId, boolean solved) {
        captchaSessionRepository.findByChallengeId(challengeId).ifPresent(entity -> {
            entity.setSolved(solved);
            entity.setAttempts(entity.getAttempts() + 1);
            if (solved) {
                entity.setSolvedAt(Instant.now());
            }
            captchaSessionRepository.save(entity);
        });
    }

    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
