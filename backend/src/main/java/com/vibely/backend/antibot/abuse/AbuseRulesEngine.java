package com.vibely.backend.antibot.abuse;

import com.vibely.backend.antibot.config.AntiBotProperties;
import com.vibely.backend.antibot.telemetry.KafkaAntiBotTelemetryPublisher;
import com.vibely.backend.antibot.telemetry.LoggingAntiBotTelemetryPublisher;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.stereotype.Service;

@Service
public class AbuseRulesEngine {

    private final AntiBotProperties properties;
    private final AbuseDetectionService abuseDetectionService;
    private final LoggingAntiBotTelemetryPublisher loggingPublisher;
    private final KafkaAntiBotTelemetryPublisher kafkaPublisher;
    private final Map<String, AtomicInteger> topicCounters = new ConcurrentHashMap<>();

    public AbuseRulesEngine(
        AntiBotProperties properties,
        AbuseDetectionService abuseDetectionService,
        LoggingAntiBotTelemetryPublisher loggingPublisher,
        @org.springframework.beans.factory.annotation.Autowired(required = false)
        KafkaAntiBotTelemetryPublisher kafkaPublisher
    ) {
        this.properties = properties;
        this.abuseDetectionService = abuseDetectionService;
        this.loggingPublisher = loggingPublisher;
        this.kafkaPublisher = kafkaPublisher;
    }

    public void process(String topic, Map<String, Object> payload) {
        if (payload == null || payload.isEmpty()) {
            return;
        }
        String event = String.valueOf(payload.getOrDefault("event", "unknown"));
        topicCounters.computeIfAbsent(topic + ":" + event, key -> new AtomicInteger()).incrementAndGet();

        switch (topic) {
            case "login-events" -> processLoginEvent(event, payload);
            case "captcha-events" -> processCaptchaEvent(event, payload);
            case "risk-events" -> processRiskEvent(payload);
            case "behavior-events" -> processBehaviorEvent(payload);
            default -> {
                // no-op
            }
        }
    }

    private void processLoginEvent(String event, Map<String, Object> payload) {
        if (!"login_failed".equals(event)) {
            return;
        }
        String ipHash = stringValue(payload.get("ipHash"));
        String emailHash = stringValue(payload.get("emailHash"));
        int ipFails = topicCounters.getOrDefault("login-events:login_failed", new AtomicInteger()).get();
        if (ipFails >= properties.getMediumFailureThreshold()) {
            abuseDetectionService.reportSignal("IP", ipHash, "credential_stuffing", "login_failed_spike");
            publishAbuseEvent(Map.of(
                "event", "automation_suspected",
                "subject", ipHash,
                "reason", "login_failed_spike"
            ));
        }
        if (emailHash != null) {
            abuseDetectionService.reportSignal("EMAIL", emailHash, "credential_stuffing", event);
        }
    }

    private void processCaptchaEvent(String event, Map<String, Object> payload) {
        if ("verify_failed".equals(event)) {
            String challengeId = stringValue(payload.get("challengeId"));
            abuseDetectionService.reportSignal("CAPTCHA", challengeId, "captcha_fail", event);
        }
    }

    private void processRiskEvent(Map<String, Object> payload) {
        Object scoreRaw = payload.get("score");
        if (scoreRaw == null) {
            return;
        }
        int score = Integer.parseInt(String.valueOf(scoreRaw));
        if (score >= 75) {
            String sessionId = stringValue(payload.get("sessionId"));
            abuseDetectionService.reportSignal("SESSION", sessionId, "high_risk", "risk_score=" + score);
        }
    }

    private void processBehaviorEvent(Map<String, Object> payload) {
        Object suspicious = payload.get("suspicious");
        if (Boolean.TRUE.equals(suspicious)) {
            String sessionId = stringValue(payload.get("sessionId"));
            abuseDetectionService.reportSignal("SESSION", sessionId, "robotic_behavior", "behavior_suspicious");
            publishAbuseEvent(Map.of(
                "event", "automation_detected",
                "sessionId", sessionId
            ));
        }
    }

    private void publishAbuseEvent(Map<String, Object> payload) {
        loggingPublisher.publish("abuse-events", payload);
        if (kafkaPublisher != null) {
            kafkaPublisher.publish("abuse-events", payload);
        }
    }

    private String stringValue(Object raw) {
        return raw == null ? "unknown" : String.valueOf(raw);
    }
}
