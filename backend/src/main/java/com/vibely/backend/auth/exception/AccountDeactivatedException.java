package com.vibely.backend.auth.exception;

public class AccountDeactivatedException extends RuntimeException {

    private final String email;

    public AccountDeactivatedException(String email) {
        super("Account has been deactivated");
        this.email = email;
    }

    public String getEmail() {
        return email;
    }
}
