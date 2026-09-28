package com.vibely.backend.live.websocket;

import com.vibely.backend.live.entity.Live;
import com.vibely.backend.live.entity.LiveStatus;
import com.vibely.backend.live.exception.LiveException;
import com.vibely.backend.live.realtime.LiveEventPublisher;
import com.vibely.backend.live.service.LiveAccessService;
import com.vibely.backend.live.service.LiveActorResolver;
import com.vibely.backend.live.service.LiveViewerService;
import com.vibely.backend.user.entity.User;
import java.security.Principal;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.lang.NonNull;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

/**
 * Authorizes SUBSCRIBE to {@code /topic/live/{liveId}} and turns subscriptions into viewer presence.
 * Runs after {@code StompDestinationInterceptor} has validated the destination shape.
 */
@Component
public class LiveStompSubscriptionInterceptor implements ChannelInterceptor {

    private static final Logger log = LoggerFactory.getLogger(LiveStompSubscriptionInterceptor.class);
    private static final Pattern LIVE_TOPIC = Pattern.compile(
        "^" + Pattern.quote(LiveEventPublisher.TOPIC_PREFIX) + "([0-9a-fA-F-]{36})$"
    );

    private final LiveActorResolver actorResolver;
    private final LiveAccessService accessService;
    private final LiveViewerService viewerService;

    public LiveStompSubscriptionInterceptor(
        LiveActorResolver actorResolver,
        LiveAccessService accessService,
        LiveViewerService viewerService
    ) {
        this.actorResolver = actorResolver;
        this.accessService = accessService;
        this.viewerService = viewerService;
    }

    @Override
    public Message<?> preSend(@NonNull Message<?> message, @NonNull MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() == null) {
            return message;
        }
        StompCommand command = accessor.getCommand();
        if (command == StompCommand.SUBSCRIBE) {
            String destination = accessor.getDestination();
            Matcher matcher = destination == null ? null : LIVE_TOPIC.matcher(destination);
            if (matcher != null && matcher.matches()) {
                authorizeAndJoin(accessor, matcher.group(1));
            }
        } else if (command == StompCommand.UNSUBSCRIBE) {
            if (accessor.getSessionId() != null) {
                viewerService.leaveLive(accessor.getSessionId(), accessor.getSubscriptionId());
            }
        }
        return message;
    }

    private void authorizeAndJoin(StompHeaderAccessor accessor, String liveId) {
        Principal principal = accessor.getUser();
        String sessionId = accessor.getSessionId();
        String subscriptionId = accessor.getSubscriptionId();
        if (principal == null || sessionId == null || subscriptionId == null) {
            throw new MessagingException("Subscription not allowed");
        }
        User user = actorResolver.findByPrincipalName(principal.getName())
            .orElseThrow(() -> new MessagingException("Subscription not allowed"));
        Live live;
        try {
            live = accessService.requireViewable(liveId, user);
        } catch (LiveException ex) {
            throw new MessagingException("Subscription not allowed");
        }
        boolean staff = accessService.canModerate(live, user);
        if (live.getStatus() != LiveStatus.LIVE && !staff) {
            throw new MessagingException("LIVE is not active");
        }
        if (live.getStatus() == LiveStatus.LIVE) {
            // A reused subscription id must not hold two viewer slots.
            viewerService.leaveLive(sessionId, subscriptionId);
            if (!viewerService.joinLive(live, user, sessionId, subscriptionId)) {
                throw new MessagingException("LIVE is not active");
            }
        }
        log.debug("live.subscribe live={} userId={} staff={}", live.getPublicId(), user.getId(), staff);
    }
}
