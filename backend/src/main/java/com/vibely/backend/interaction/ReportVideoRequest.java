package com.vibely.backend.interaction;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class ReportVideoRequest {

    @NotBlank(message = "Lý do báo cáo là bắt buộc")
    @Size(max = 500, message = "Lý do báo cáo tối đa 500 ký tự")
    private String reason;

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }
}
