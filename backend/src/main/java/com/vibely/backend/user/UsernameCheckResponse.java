package com.vibely.backend.user;

public record UsernameCheckResponse(
    boolean available,
    String normalizedUsername,
    String message,
    String suggestion
) {
}
