package com.vibely.backend.enhancement;

import java.time.Instant;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@ConditionalOnProperty(prefix = "app.enhancement", name = "rabbitmq-enabled", havingValue = "true")
public class EnhancementOutboxPublisher {

    private static final Logger log = LoggerFactory.getLogger(EnhancementOutboxPublisher.class);

    private final EnhancementEventOutboxRepository outboxRepository;
    private final EnhancementProperties properties;
    private final RabbitTemplate enhanceRabbitTemplate;

    public EnhancementOutboxPublisher(
        EnhancementEventOutboxRepository outboxRepository,
        EnhancementProperties properties,
        @Qualifier("enhanceRabbitTemplate") RabbitTemplate enhanceRabbitTemplate
    ) {
        this.outboxRepository = outboxRepository;
        this.properties = properties;
        this.enhanceRabbitTemplate = enhanceRabbitTemplate;
    }

    @Scheduled(fixedDelayString = "${app.enhancement.outbox-publish-interval-ms:5000}", initialDelayString = "20000")
    @Transactional
    public void publishOutbox() {
        List<EnhancementEventOutboxEntity> batch = outboxRepository.findUnpublished(PageRequest.of(0, 50));
        for (EnhancementEventOutboxEntity event : batch) {
            try {
                enhanceRabbitTemplate.convertAndSend(
                    properties.getExchange(),
                    properties.getRoutingKey(),
                    event.getPayload()
                );
                event.setPublishedAt(Instant.now());
                outboxRepository.save(event);
            } catch (Exception ex) {
                log.warn("Enhancement outbox publish failed id={}: {}", event.getId(), ex.getMessage());
                break;
            }
        }
    }
}
