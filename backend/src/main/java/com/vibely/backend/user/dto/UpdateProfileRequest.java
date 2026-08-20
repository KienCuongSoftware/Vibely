package com.vibely.backend.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
    @NotBlank(message = "Please enter a Vibely ID")
    @Size(min = 4, max = 24, message = "Vibely ID must be 4-24 characters")
    String username,
    @NotBlank(message = "Please enter a display name")
    @Size(max = 80, message = "Display name must be at most 80 characters")
    String displayName,
    @Size(max = 300, message = "Bio must be at most 300 characters")
    String bio,
    @Size(max = 512, message = "Avatar URL must be at most 512 characters")
    String avatarUrl
) {
}
