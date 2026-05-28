package com.vibely.backend.antibot.abuse;

import com.vibely.backend.antibot.telemetry.KafkaAntiBotTelemetryPublisher;
import com.vibely.backend.antibot.telemetry.LoggingAntiBotTelemetryPublisher;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class AbuseDetectionService {

    private final LoggingAntiBotTelemetryPublisher loggingPublisher;
    private final KafkaAntiBotTelemetryPublisher kafkaPublisher;

    public AbuseDetectionService(
        LoggingAntiBotTelemetryPublisher loggingPublisher,
        @Autowired(required = false) KafkaAntiBotTelemetryPublisher kafkaPublisher
    ) {
        this.loggingPublisher = loggingPublisher;
        this.kafkaPublisher = kafkaPublisher;
    }

    public void reportSignal(String subjectType, String subjectKey, String category, String detail) {
        Map<String, Object> payload = Map.of(
            "event", "abuse_signal",
            "subjectType", subjectType,
            "subjectKey", subjectKey,
            "category", category,
            "detail", detail == null ? "" : detail
        );
        loggingPublisher.publish("abuse-events", payload);
        if (kafkaPublisher != null) {
            kafkaPublisher.publish("abuse-events", payload);
        }
    }
}
