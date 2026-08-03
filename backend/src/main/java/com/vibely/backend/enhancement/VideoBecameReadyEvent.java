package com.vibely.backend.enhancement;

/**
 * Published after standard HLS processing marks a video READY.
 * Enhancement module listens; FFmpeg pipeline stays unaware of AI details.
 */
public record VideoBecameReadyEvent(long videoId) {}
