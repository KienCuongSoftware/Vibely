package com.vibely.backend.antibot.telemetry;

import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class LoggingAntiBotTelemetryPublisher implements AntiBotTelemetryPublisher {

    private static final Logger log = LoggerFactory.getLogger(LoggingAntiBotTelemetryPublisher.class);

    @Override
    public void publish(String topic, Map<String, Object> payload) {
        log.info("antibot telemetry topic={} payload={}", topic, payload);
    }
}
