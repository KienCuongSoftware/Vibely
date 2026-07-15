package com.vibely.backend.video;

/**
 * Publication / moderation lifecycle for a video.
 * <p>
 * Processing: {@link #RAW} → {@link #PROCESSING} → {@link #READY} or {@link #FAILED}.
 * When moderation apply-decisions is on, published videos are held at {@link #HIDDEN}
 * until the AI policy worker returns ALLOW/LIMIT (then READY) or BLOCK (REMOVED).
 * Other moderation outcomes: {@link #REPORTED}, {@link #HIDDEN}, {@link #REMOVED}.
 */
public enum VideoStatus {
    RAW,
    PROCESSING,
    READY,
    FAILED,
    REPORTED,
    HIDDEN,
    /** Đã gỡ bởi tác giả — không hiển thị công khai */
    REMOVED
}
