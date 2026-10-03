package com.vibely.backend.live.exception;

import org.springframework.http.HttpStatus;

public enum LiveErrorCode {
    LIVE_NOT_FOUND(HttpStatus.NOT_FOUND, "LIVE not found"),
    INVALID_LIVE_ID(HttpStatus.BAD_REQUEST, "Invalid LIVE id"),
    INVALID_CATEGORY(HttpStatus.BAD_REQUEST, "Invalid LIVE category"),
    INVALID_VISIBILITY(HttpStatus.BAD_REQUEST, "Invalid LIVE visibility"),
    LIVE_ALREADY_STARTED(HttpStatus.BAD_REQUEST, "This LIVE has already started"),
    LIVE_ALREADY_ENDED(HttpStatus.BAD_REQUEST, "This LIVE has already ended"),
    LIVE_NOT_ACTIVE(HttpStatus.BAD_REQUEST, "This LIVE is not currently live"),
    INVALID_LIVE_STATE(HttpStatus.BAD_REQUEST, "This action is not allowed in the current LIVE state"),
    HOST_ALREADY_LIVE(HttpStatus.CONFLICT, "You already have another LIVE in progress"),
    CONCURRENT_UPDATE(HttpStatus.CONFLICT, "The LIVE was changed by another request. Please retry"),
    NOT_LIVE_HOST(HttpStatus.FORBIDDEN, "Only the host can perform this action"),
    MODERATION_NOT_ALLOWED(HttpStatus.FORBIDDEN, "You are not allowed to moderate this LIVE"),
    COMMENTS_DISABLED(HttpStatus.FORBIDDEN, "Comments are turned off for this LIVE"),
    USER_BANNED(HttpStatus.FORBIDDEN, "You have been banned from this LIVE"),
    USER_MUTED(HttpStatus.FORBIDDEN, "You have been muted in this LIVE"),
    COMMENT_EMPTY(HttpStatus.BAD_REQUEST, "Comment cannot be empty"),
    COMMENT_TOO_LONG(HttpStatus.BAD_REQUEST, "Comment is too long"),
    COMMENT_NOT_FOUND(HttpStatus.NOT_FOUND, "Comment not found"),
    INVALID_LIKE_COUNT(HttpStatus.BAD_REQUEST, "Like count must be positive"),
    INVALID_RESTRICTION_TARGET(HttpStatus.BAD_REQUEST, "This user cannot be restricted"),
    INVALID_MODERATOR(HttpStatus.BAD_REQUEST, "This user cannot be a moderator"),
    ALREADY_REPORTED(HttpStatus.BAD_REQUEST, "You have already reported this"),
    RATE_LIMIT_EXCEEDED(HttpStatus.TOO_MANY_REQUESTS, "You are sending messages too fast"),
    GIFTS_UNAVAILABLE(HttpStatus.NOT_IMPLEMENTED, "Gifts are not available yet"),
    MEDIA_DISABLED(HttpStatus.NOT_IMPLEMENTED, "LIVE video streaming is not enabled"),
    MEDIA_UNAVAILABLE(HttpStatus.SERVICE_UNAVAILABLE, "LIVE video is not available right now"),
    REPLAY_NOT_FOUND(HttpStatus.NOT_FOUND, "No replay is available for this LIVE");

    private final HttpStatus status;
    private final String defaultMessage;

    LiveErrorCode(HttpStatus status, String defaultMessage) {
        this.status = status;
        this.defaultMessage = defaultMessage;
    }

    public HttpStatus status() {
        return status;
    }

    public String defaultMessage() {
        return defaultMessage;
    }
}
