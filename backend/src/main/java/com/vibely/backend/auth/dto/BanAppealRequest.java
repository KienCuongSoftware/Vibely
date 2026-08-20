package com.vibely.backend.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record BanAppealRequest(
    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email")
    String email,

    @NotBlank(message = "Description is required")
    @Size(min = 5, max = 200, message = "Description must be between 5 and 200 characters")
    String description,

    @Size(max = 500, message = "Ban reason must be at most 500 characters")
    String banReason,

    @Size(max = 120, message = "Account email must be at most 120 characters")
    String maskedAccountEmail
) {
}
