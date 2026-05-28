package com.vibely.backend.antibot.telemetry;

import java.util.Map;

public interface AntiBotTelemetryPublisher {
    void publish(String topic, Map<String, Object> payload);
}
