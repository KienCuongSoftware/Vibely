package com.vibely.backend.video;

/**
 * Publication / moderation lifecycle for a video.
 * <p>
 * Processing: {@link #RAW} → {@link #PROCESSING} → {@link #READY} or {@link #FAILED}.
 * Moderation (after {@link #READY}): {@link #REPORTED}, {@link #HIDDEN}, {@link #REMOVED}.
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
