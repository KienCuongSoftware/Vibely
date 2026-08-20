package com.vibely.backend.auth.dto;

import jakarta.validation.constraints.NotBlank;

public class OAuthExchangeRequest {

    @NotBlank(message = "Login code cannot be empty")
    private String code;

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }
}
