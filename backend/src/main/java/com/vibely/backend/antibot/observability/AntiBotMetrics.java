package com.vibely.backend.antibot.observability;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class AntiBotMetrics {

    private final MeterRegistry meterRegistry;

    public AntiBotMetrics(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }

    public void recordEvent(String topic, Map<String, Object> payload) {
        String event = String.valueOf(payload.getOrDefault("event", "unknown"));
        Counter.builder("antibot.events")
            .tag("topic", topic)
            .tag("event", event)
            .register(meterRegistry)
            .increment();

        if ("login-events".equals(topic) && "login_failed".equals(event)) {
            Counter.builder("antibot.login.failed").register(meterRegistry).increment();
        }
        if ("captcha-events".equals(topic) && "verify_failed".equals(event)) {
            Counter.builder("antibot.captcha.failed").register(meterRegistry).increment();
        }
        if ("captcha-events".equals(topic) && "verify_success".equals(event)) {
            Counter.builder("antibot.captcha.success").register(meterRegistry).increment();
        }
        if ("risk-events".equals(topic)) {
            Object score = payload.get("score");
            if (score != null) {
                meterRegistry.summary("antibot.risk.score").record(Double.parseDouble(String.valueOf(score)));
            }
        }
    }
}
