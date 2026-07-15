package com.vibely.backend.moderation;

import java.time.LocalDateTime;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@ConditionalOnProperty(prefix = "app.moderation", name = "enabled", havingValue = "true", matchIfMissing = true)
public class ModerationOutboxPublisher {

    private static final Logger log = LoggerFactory.getLogger(ModerationOutboxPublisher.class);

    private final ModerationEventOutboxRepository outboxRepository;
    private final ModerationProperties properties;
    private final ObjectProvider<RabbitTemplate> rabbitTemplateProvider;

    public ModerationOutboxPublisher(
        ModerationEventOutboxRepository outboxRepository,
        ModerationProperties properties,
        ObjectProvider<RabbitTemplate> rabbitTemplateProvider
    ) {
        this.outboxRepository = outboxRepository;
        this.properties = properties;
        this.rabbitTemplateProvider = rabbitTemplateProvider;
    }

    @Scheduled(fixedDelayString = "${app.moderation.outbox-publish-interval-ms:5000}", initialDelayString = "18000")
    @Transactional
    public void publishOutbox() {
        if (!properties.isRabbitmqEnabled()) {
            return;
        }
        RabbitTemplate rabbit = rabbitTemplateProvider.getIfAvailable();
        if (rabbit == null) {
            return;
        }
        List<ModerationEventOutboxEntity> batch = outboxRepository.findUnpublished(PageRequest.of(0, 50));
        for (ModerationEventOutboxEntity event : batch) {
            try {
                String routingKey = routingKeyFor(event.getEventType());
                rabbit.convertAndSend(properties.getExchange(), routingKey, event.getPayload());
                event.setPublishedAt(LocalDateTime.now());
                outboxRepository.save(event);
            } catch (Exception ex) {
                log.warn("Moderation outbox publish failed id={}: {}", event.getId(), ex.getMessage());
                break;
            }
        }
    }

    private String routingKeyFor(String eventType) {
        if (eventType == null) {
            return properties.getRoutingKeyEvaluate();
        }
        return switch (eventType) {
            case "moderation.evaluate.requested" -> properties.getRoutingKeyEvaluate();
            case "moderation.completed" -> "moderation.completed";
            case "moderation.review.required" -> "moderation.review.required";
            case "moderation.human.overridden" -> "moderation.human.overridden";
            case "content.understanding.completed.v1" -> "content.understanding.completed";
            case "originality.completed.v1" -> "originality.completed";
            default -> properties.getRoutingKeyEvaluate();
        };
    }
}
