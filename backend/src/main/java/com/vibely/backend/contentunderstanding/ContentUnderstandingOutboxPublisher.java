package com.vibely.backend.contentunderstanding;

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
@ConditionalOnProperty(prefix = "app.content-understanding", name = "enabled", havingValue = "true", matchIfMissing = true)
public class ContentUnderstandingOutboxPublisher {

    private static final Logger log = LoggerFactory.getLogger(ContentUnderstandingOutboxPublisher.class);

    private final CuEventOutboxRepository outboxRepository;
    private final ContentUnderstandingProperties properties;
    private final ObjectProvider<RabbitTemplate> rabbitTemplateProvider;

    public ContentUnderstandingOutboxPublisher(
        CuEventOutboxRepository outboxRepository,
        ContentUnderstandingProperties properties,
        ObjectProvider<RabbitTemplate> rabbitTemplateProvider
    ) {
        this.outboxRepository = outboxRepository;
        this.properties = properties;
        this.rabbitTemplateProvider = rabbitTemplateProvider;
    }

    @Scheduled(fixedDelayString = "${app.content-understanding.outbox-publish-interval-ms:5000}", initialDelayString = "15000")
    @Transactional
    public void publishOutbox() {
        if (!properties.isRabbitmqEnabled()) {
            return;
        }
        RabbitTemplate rabbit = rabbitTemplateProvider.getIfAvailable();
        if (rabbit == null) {
            return;
        }
        List<CuEventOutboxEntity> batch = outboxRepository.findUnpublished(PageRequest.of(0, 50));
        for (CuEventOutboxEntity event : batch) {
            try {
                rabbit.convertAndSend(
                    properties.getExchange(),
                    properties.getRoutingKeyAnalyze(),
                    event.getPayload()
                );
                event.setPublishedAt(LocalDateTime.now());
                outboxRepository.save(event);
            } catch (Exception ex) {
                log.warn("CU outbox publish failed id={}: {}", event.getId(), ex.getMessage());
                break;
            }
        }
    }
}
