package com.vibely.backend.live.realtime;

import com.vibely.backend.live.dto.LiveUserResponse;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

/**
 * STOMP subscriptions to LIVE topics on this node, keyed by WebSocket session and subscription id,
 * so UNSUBSCRIBE / disconnect / LIVE end release exactly the viewer slots that were taken.
 */
@Component
public class LivePresenceRegistry {

    private final Map<String, Map<String, LivePresence>> sessions = new ConcurrentHashMap<>();

    public void add(LivePresence presence) {
        sessions.computeIfAbsent(presence.sessionId(), ignored -> new ConcurrentHashMap<>())
            .put(presence.subscriptionId(), presence);
    }

    public Optional<LivePresence> remove(String sessionId, String subscriptionId) {
        Map<String, LivePresence> subscriptions = sessions.get(sessionId);
        if (subscriptions == null || subscriptionId == null) {
            return Optional.empty();
        }
        LivePresence removed = subscriptions.remove(subscriptionId);
        if (subscriptions.isEmpty()) {
            sessions.remove(sessionId, subscriptions);
        }
        return Optional.ofNullable(removed);
    }

    public List<LivePresence> removeSession(String sessionId) {
        Map<String, LivePresence> subscriptions = sessions.remove(sessionId);
        return subscriptions == null ? List.of() : new ArrayList<>(subscriptions.values());
    }

    public List<LivePresence> removeLive(long liveId) {
        List<LivePresence> removed = new ArrayList<>();
        for (Map<String, LivePresence> subscriptions : sessions.values()) {
            subscriptions.entrySet().removeIf(entry -> {
                if (entry.getValue().liveId() == liveId) {
                    removed.add(entry.getValue());
                    return true;
                }
                return false;
            });
        }
        return removed;
    }

    public boolean isSubscribed(String sessionId, long liveId) {
        Map<String, LivePresence> subscriptions = sessions.get(sessionId);
        return subscriptions != null && subscriptions.values().stream().anyMatch(presence -> presence.liveId() == liveId);
    }

    /**
     * @param counted whether this subscription holds a viewer slot (the host and uncounted fallbacks do not)
     */
    public record LivePresence(
        String sessionId,
        String subscriptionId,
        long liveId,
        UUID livePublicId,
        long userId,
        LiveUserResponse profile,
        boolean counted,
        LocalDateTime joinedAt
    ) {}
}
