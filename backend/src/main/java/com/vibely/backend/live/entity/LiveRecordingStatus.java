package com.vibely.backend.live.entity;

/**
 * RECORDING while the LIVE is on air, PROCESSING from the LIVE end until the replay video is READY
 * in the video pipeline, DELETED once the host removed that video.
 */
public enum LiveRecordingStatus {
    RECORDING,
    PROCESSING,
    READY,
    FAILED,
    DELETED;

    public boolean isFinished() {
        return this == READY || this == FAILED || this == DELETED;
    }
}
