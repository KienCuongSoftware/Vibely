package com.vibely.backend.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class ReactivateAccountRequest {

    @NotBlank(message = "Account reactivation session is required")
    private String reactivationToken;

    @NotBlank(message = "Verification code is required")
    @Pattern(regexp = "\\d{6}", message = "Verification code must be 6 digits")
    private String code;

    public String getReactivationToken() {
        return reactivationToken;
    }

    public void setReactivationToken(String reactivationToken) {
        this.reactivationToken = reactivationToken;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }
}
