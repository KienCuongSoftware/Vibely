package com.vibely.backend.live.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record LiveGiftRequest(
    @NotBlank(message = "Gift is required")
    String giftId,
    @Min(value = 1, message = "Quantity must be at least 1")
    @Max(value = 99, message = "Quantity must be at most 99")
    Integer quantity
) {}
