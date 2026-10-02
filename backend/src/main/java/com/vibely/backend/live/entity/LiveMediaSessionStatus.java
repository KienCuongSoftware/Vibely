package com.vibely.backend.live.entity;

/**
 * Media-plane state of a broadcast, driven by SRS hooks and health checks.
 * PENDING: LIVE started, host not publishing yet. PUBLISHING: SRS accepted the host stream.
 * INTERRUPTED: the stream dropped and the host may still reconnect within the grace period.
 * ENDED: revoked; SRS rejects any further publish or play for this session.
 */
public enum LiveMediaSessionStatus {
    PENDING,
    PUBLISHING,
    INTERRUPTED,
    ENDED
}
