package com.vibely.backend.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateAccountRegionRequest(
    @NotBlank
    @Size(min = 2, max = 8)
    String accountRegion
) {
}
