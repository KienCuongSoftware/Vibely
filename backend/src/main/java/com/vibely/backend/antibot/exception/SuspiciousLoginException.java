package com.vibely.backend.antibot.exception;

public class SuspiciousLoginException extends RuntimeException {

    public SuspiciousLoginException(String message) {
        super(message);
    }
}
