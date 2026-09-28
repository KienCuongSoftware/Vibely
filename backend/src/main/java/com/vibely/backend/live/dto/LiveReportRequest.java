package com.vibely.backend.live.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Reports the LIVE, or one of its comments when {@code commentId} is set. */
public record LiveReportRequest(
    @NotBlank(message = "Reason is required")
    @Size(max = 64, message = "Reason must be at most 64 characters")
    String reason,
    @Size(max = 500, message = "Details must be at most 500 characters")
    String details,
    Long commentId
) {}
