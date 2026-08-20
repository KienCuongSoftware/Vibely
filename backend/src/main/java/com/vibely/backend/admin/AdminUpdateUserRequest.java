package com.vibely.backend.admin;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AdminUpdateUserRequest(
    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email")
    String email,

    @NotBlank(message = "Vibely ID is required")
    String username,

    @NotBlank(message = "Display name is required")
    @Size(max = 80, message = "Display name must be at most 80 characters")
    String displayName,

    @NotBlank(message = "Role is required")
    String role,

    String password
) {
}
