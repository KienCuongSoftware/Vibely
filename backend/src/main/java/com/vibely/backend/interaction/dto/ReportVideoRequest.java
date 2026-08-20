package com.vibely.backend.interaction.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class ReportVideoRequest {

    @NotBlank(message = "Report reason is required")
    @Size(max = 500, message = "Report reason must be at most 500 characters")
    private String reason;

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }
}
