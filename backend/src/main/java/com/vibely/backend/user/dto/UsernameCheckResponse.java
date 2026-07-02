package com.vibely.backend.user.dto;

public record UsernameCheckResponse(
    boolean available,
    String normalizedUsername,
    String message,
    String suggestion
) {
}
