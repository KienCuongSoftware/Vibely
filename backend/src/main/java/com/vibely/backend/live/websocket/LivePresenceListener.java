package com.vibely.backend.live.websocket;

import com.vibely.backend.live.service.LiveViewerService;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

/** Releases every LIVE viewer slot held by a WebSocket session when it closes (clean or not). */
@Component
public class LivePresenceListener {

    private final LiveViewerService viewerService;

    public LivePresenceListener(LiveViewerService viewerService) {
        this.viewerService = viewerService;
    }

    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        if (event.getSessionId() != null) {
            viewerService.leaveAll(event.getSessionId());
        }
    }
}
