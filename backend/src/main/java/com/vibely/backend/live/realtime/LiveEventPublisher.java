package com.vibely.backend.live.realtime;

import java.time.Instant;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

@Component
public class LiveEventPublisher {

    public static final String TOPIC_PREFIX = "/topic/live/";

    private static final Logger log = LoggerFactory.getLogger(LiveEventPublisher.class);

    private final SimpMessagingTemplate messagingTemplate;

    public LiveEventPublisher(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public static String topic(UUID livePublicId) {
        return TOPIC_PREFIX + livePublicId;
    }

    /** Best effort: the database is the source of truth, so a failed push never fails the request. */
    public void publish(UUID livePublicId, LiveEventType type, Object payload) {
        LiveEvent event = new LiveEvent(type, livePublicId.toString(), payload, Instant.now());
        try {
            messagingTemplate.convertAndSend(topic(livePublicId), event);
        } catch (RuntimeException ex) {
            log.warn("live.event.publish_failed type={} live={} reason={}", type, livePublicId, ex.getClass().getSimpleName());
        }
    }
}
