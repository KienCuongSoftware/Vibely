package com.vibely.backend.user.dto;

public record UsernameCheckResponse(
    boolean available,
    String normalizedUsername,
    String message,
    String suggestion,
    boolean bloomPrefiltered,
    boolean canRecheck
) {
    public UsernameCheckResponse(
        boolean available,
        String normalizedUsername,
        String message,
        String suggestion
    ) {
        this(available, normalizedUsername, message, suggestion, false, false);
    }
}
