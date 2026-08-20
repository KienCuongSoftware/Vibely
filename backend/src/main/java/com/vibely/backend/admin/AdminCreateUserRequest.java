package com.vibely.backend.admin;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record AdminCreateUserRequest(
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

    @NotBlank(message = "Password is required")
    @Size(min = 6, max = 100, message = "Password must be between 6 and 100 characters")
    String password,

    @NotNull(message = "Date of birth is required")
    LocalDate birthDate
) {
}
