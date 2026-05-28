package com.vibely.backend.antibot.telemetry;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "app.antibot.kafka-enabled", havingValue = "true")
public class KafkaAntiBotTelemetryPublisher implements AntiBotTelemetryPublisher {

    private static final Logger log = LoggerFactory.getLogger(KafkaAntiBotTelemetryPublisher.class);

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;

    public KafkaAntiBotTelemetryPublisher(
        KafkaTemplate<String, String> kafkaTemplate,
        ObjectMapper objectMapper
    ) {
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;
    }

    @Override
    public void publish(String topic, Map<String, Object> payload) {
        try {
            String body = objectMapper.writeValueAsString(payload);
            String key = String.valueOf(payload.getOrDefault("event", "event"));
            kafkaTemplate.send(topic, key, body);
        } catch (JsonProcessingException ex) {
            log.warn("Failed to serialize telemetry payload for topic {}", topic, ex);
        }
    }
}
