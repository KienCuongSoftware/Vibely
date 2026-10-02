package com.vibely.backend.live.media;

public class SrsUnavailableException extends RuntimeException {

    public SrsUnavailableException(String message) {
        super(message);
    }

    public SrsUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
