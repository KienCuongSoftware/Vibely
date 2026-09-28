package com.vibely.backend.live.exception;

public class LiveException extends RuntimeException {

    private final LiveErrorCode code;

    public LiveException(LiveErrorCode code) {
        this(code, code.defaultMessage());
    }

    public LiveException(LiveErrorCode code, String message) {
        super(message);
        this.code = code;
    }

    public LiveErrorCode getCode() {
        return code;
    }
}
