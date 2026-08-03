package com.vibely.backend.enhancement;

public enum EnhancementJobState {
    PENDING,
    QUEUED,
    DOWNLOADING,
    AI_PROCESSING,
    GENERATING_HLS,
    UPLOADING,
    COMPLETED,
    FAILED,
    RETRYING,
    DEAD,
    CANCELLED,
    SKIPPED
}
