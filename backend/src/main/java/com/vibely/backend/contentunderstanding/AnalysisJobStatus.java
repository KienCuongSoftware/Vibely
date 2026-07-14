package com.vibely.backend.contentunderstanding;

public enum AnalysisJobStatus {
    PENDING,
    RUNNING,
    COMPLETED,
    FAILED_RETRYABLE,
    FAILED_TERMINAL
}
