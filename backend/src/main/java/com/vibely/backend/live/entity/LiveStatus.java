package com.vibely.backend.live.entity;

public enum LiveStatus {
    CREATED,
    LIVE,
    ENDED,
    CANCELLED;

    public boolean isFinished() {
        return this == ENDED || this == CANCELLED;
    }
}
