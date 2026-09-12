package com.vibely.backend.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdatePreferredLocaleRequest(
    @NotBlank
    @Size(min = 2, max = 16)
    String preferredLocale
) {
}
