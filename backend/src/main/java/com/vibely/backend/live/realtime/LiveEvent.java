package com.vibely.backend.live.realtime;

import java.time.Instant;

/** Envelope pushed to {@code /topic/live/{liveId}}; {@code liveId} is the public UUID. */
public record LiveEvent(LiveEventType type, String liveId, Object payload, Instant timestamp) {}
