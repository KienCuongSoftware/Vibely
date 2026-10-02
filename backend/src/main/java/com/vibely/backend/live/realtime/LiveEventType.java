package com.vibely.backend.live.realtime;

public enum LiveEventType {
    LIVE_STARTED,
    LIVE_ENDED,
    LIVE_UPDATED,
    VIEWER_COUNT_UPDATED,
    COMMENT_CREATED,
    COMMENT_DELETED,
    LIKE_UPDATED,
    USER_JOINED,
    USER_LEFT,
    USER_RESTRICTED,
    /** The host's media stream started or stopped on SRS (payload: publishing, reconnectDeadline). */
    STREAM_STATE_UPDATED
}
