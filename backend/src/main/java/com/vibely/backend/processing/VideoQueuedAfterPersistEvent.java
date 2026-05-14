package com.vibely.backend.processing;

import org.springframework.context.ApplicationEvent;

/**
 * Published after a new video row and its processing job are committed, so async handlers never see stale DB state.
 */
public class VideoQueuedAfterPersistEvent extends ApplicationEvent {

    private final long videoId;

    public VideoQueuedAfterPersistEvent(Object source, long videoId) {
        super(source);
        this.videoId = videoId;
    }

    public long getVideoId() {
        return videoId;
    }
}
