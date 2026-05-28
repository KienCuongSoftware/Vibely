package com.vibely.backend.antibot.telemetry;

import com.vibely.backend.antibot.abuse.AbuseRulesEngine;
import com.vibely.backend.antibot.observability.AntiBotMetrics;
import java.util.Map;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

@Component
@Primary
public class CompositeAntiBotTelemetryPublisher implements AntiBotTelemetryPublisher {

    private final AbuseRulesEngine abuseRulesEngine;
    private final AntiBotMetrics metrics;
    private final LoggingAntiBotTelemetryPublisher loggingPublisher;
    private final KafkaAntiBotTelemetryPublisher kafkaPublisher;

    public CompositeAntiBotTelemetryPublisher(
        AbuseRulesEngine abuseRulesEngine,
        AntiBotMetrics metrics,
        LoggingAntiBotTelemetryPublisher loggingPublisher,
        @org.springframework.beans.factory.annotation.Autowired(required = false)
        KafkaAntiBotTelemetryPublisher kafkaPublisher
    ) {
        this.abuseRulesEngine = abuseRulesEngine;
        this.metrics = metrics;
        this.loggingPublisher = loggingPublisher;
        this.kafkaPublisher = kafkaPublisher;
    }

    @Override
    public void publish(String topic, Map<String, Object> payload) {
        abuseRulesEngine.process(topic, payload);
        metrics.recordEvent(topic, payload);
        loggingPublisher.publish(topic, payload);
        if (kafkaPublisher != null) {
            kafkaPublisher.publish(topic, payload);
        }
    }
}
