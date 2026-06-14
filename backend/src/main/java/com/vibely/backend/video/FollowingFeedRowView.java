package com.vibely.backend.video;

import java.time.LocalDateTime;

/** Upload or repost row for the Following feed (sorted by feed activity time). */
public interface FollowingFeedRowView {

    Long getVideoId();

    LocalDateTime getFeedAt();

    /** Null when the row is an original upload from a followed creator. */
    Long getReposterUserId();
}
