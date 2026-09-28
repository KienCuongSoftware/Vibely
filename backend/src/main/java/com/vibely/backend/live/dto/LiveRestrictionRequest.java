package com.vibely.backend.live.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** {@code durationMinutes} null means the restriction lasts for the whole LIVE. */
public record LiveRestrictionRequest(
    @NotBlank(message = "Restriction type is required")
    String type,
    @Size(max = 255, message = "Reason must be at most 255 characters")
    String reason,
    @Min(value = 1, message = "Duration must be at least 1 minute")
    @Max(value = 10080, message = "Duration must be at most 7 days")
    Integer durationMinutes
) {}
