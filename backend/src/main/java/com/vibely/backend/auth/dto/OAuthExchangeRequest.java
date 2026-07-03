package com.vibely.backend.auth.dto;

import jakarta.validation.constraints.NotBlank;

public class OAuthExchangeRequest {

    @NotBlank(message = "Mã đăng nhập không được để trống")
    private String code;

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }
}
