package com.vibely.backend.user.dto;

public record EmailCheckResponse(
    boolean available,
    String normalizedEmail,
    String message,
    boolean bloomPrefiltered,
    boolean canRecheck
) {
    public EmailCheckResponse(boolean available, String normalizedEmail, String message) {
        this(available, normalizedEmail, message, false, false);
    }
}
