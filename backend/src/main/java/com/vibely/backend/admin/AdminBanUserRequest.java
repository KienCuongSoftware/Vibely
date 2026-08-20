package com.vibely.backend.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AdminBanUserRequest(
    @NotBlank(message = "Ban reason is required")
    @Size(min = 5, max = 500, message = "Ban reason must be between 5 and 500 characters")
    String reason
) {
}
