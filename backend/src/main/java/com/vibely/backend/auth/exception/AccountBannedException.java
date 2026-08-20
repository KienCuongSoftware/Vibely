package com.vibely.backend.auth.exception;

public class AccountBannedException extends RuntimeException {

    private final String email;
    private final String reason;

    public AccountBannedException(String email, String reason) {
        super("Your account has been banned");
        this.email = email;
        this.reason = reason == null ? "" : reason.trim();
    }

    public String getEmail() {
        return email;
    }

    public String getReason() {
        return reason;
    }
}
