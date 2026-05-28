package com.vibely.backend.antibot.fingerprint;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vibely.backend.antibot.config.AntiBotProperties;
import com.vibely.backend.antibot.dto.AutomationSignals;
import com.vibely.backend.antibot.dto.DeviceFingerprintPayload;
import com.vibely.backend.antibot.dto.FingerprintRegisterRequest;
import com.vibely.backend.antibot.dto.FingerprintRegisterResponse;
import com.vibely.backend.antibot.persistence.AntiBotDeviceFingerprintRepository;
import com.vibely.backend.antibot.persistence.entity.AntiBotDeviceFingerprintEntity;
import com.vibely.backend.antibot.security.AntiBotHashing;
import com.vibely.backend.antibot.telemetry.AntiBotTelemetryPublisher;
import com.vibely.backend.antibot.trust.TrustScoringService;
import java.time.Instant;
import java.util.Map;
import java.util.StringJoiner;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FingerprintService {

    private final AntiBotProperties properties;
    private final AntiBotDeviceFingerprintRepository repository;
    private final TrustScoringService trustScoringService;
    private final ObjectMapper objectMapper;
    private final AntiBotTelemetryPublisher telemetryPublisher;

    public FingerprintService(
        AntiBotProperties properties,
        AntiBotDeviceFingerprintRepository repository,
        TrustScoringService trustScoringService,
        ObjectMapper objectMapper,
        AntiBotTelemetryPublisher telemetryPublisher
    ) {
        this.properties = properties;
        this.repository = repository;
        this.trustScoringService = trustScoringService;
        this.objectMapper = objectMapper;
        this.telemetryPublisher = telemetryPublisher;
    }

    @Transactional
    public FingerprintRegisterResponse register(FingerprintRegisterRequest request) {
        String deviceHash = hashFingerprint(request.fingerprint(), request.automation());
        boolean automationDetected = detectAutomation(request.automation());

        AntiBotDeviceFingerprintEntity entity = repository.findByDeviceHash(deviceHash)
            .orElseGet(AntiBotDeviceFingerprintEntity::new);

        if (entity.getDeviceHash() == null) {
            entity.setDeviceHash(deviceHash);
            entity.setTrustScore(properties.getDefaultTrustScore());
        } else {
            entity.setSeenCount(entity.getSeenCount() + 1);
            entity.setLastSeenAt(Instant.now());
        }

        entity.setUserId(request.userId());
        entity.setFingerprintJson(toJson(request.fingerprint()));
        if (automationDetected) {
            entity.setTrustScore(Math.max(0, entity.getTrustScore() - 20));
        }

        repository.save(entity);
        trustScoringService.upsertDeviceTrust(deviceHash, entity.getTrustScore());

        telemetryPublisher.publish("interaction-events", Map.of(
            "event", "fingerprint_registered",
            "deviceHash", deviceHash,
            "automationDetected", automationDetected
        ));

        return new FingerprintRegisterResponse(deviceHash, entity.getTrustScore(), automationDetected);
    }

    public String hashFingerprint(DeviceFingerprintPayload fingerprint, AutomationSignals automation) {
        StringJoiner joiner = new StringJoiner("|");
        if (fingerprint != null) {
            joiner.add(safe(fingerprint.userAgent()));
            joiner.add(safe(fingerprint.platform()));
            joiner.add(safe(fingerprint.language()));
            joiner.add(safe(fingerprint.timezone()));
            joiner.add(String.valueOf(fingerprint.screenWidth()));
            joiner.add(String.valueOf(fingerprint.screenHeight()));
            joiner.add(safe(fingerprint.canvasHash()));
            joiner.add(safe(fingerprint.webglRenderer()));
            joiner.add(safe(fingerprint.audioHash()));
        }
        if (automation != null) {
            joiner.add(String.valueOf(automation.webdriver()));
            joiner.add(String.valueOf(automation.headlessHints()));
        }
        return AntiBotHashing.sha256Hex(joiner.toString());
    }

    public int getDeviceTrustScore(String deviceHash) {
        if (deviceHash == null || deviceHash.isBlank()) {
            return properties.getDefaultTrustScore();
        }
        return repository.findByDeviceHash(deviceHash)
            .map(AntiBotDeviceFingerprintEntity::getTrustScore)
            .orElseGet(() -> trustScoringService.getDeviceTrustScore(deviceHash));
    }

    private boolean detectAutomation(AutomationSignals automation) {
        if (automation == null) {
            return false;
        }
        return automation.webdriver()
            || automation.seleniumGlobals()
            || automation.puppeteerTrace()
            || automation.playwrightTrace()
            || automation.headlessHints();
    }

    private String toJson(DeviceFingerprintPayload payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException ex) {
            return "{}";
        }
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
    }
}
