package com.vibely.backend.video;

import com.fasterxml.jackson.annotation.JsonAlias;

/**
 * Client báo thời lượng đã phát (sau khi progressive hoặc HLS bind vào phần tử video).
 * Chỉ khi đạt ngưỡng mới được ghi vào analytics — không tính pure impression khi scroll feed.
 */
public record VideoViewRequest(
    @JsonAlias("watched_ms") Long watchedMs,
    @JsonAlias("duration_ms") Long durationMs
) {}
