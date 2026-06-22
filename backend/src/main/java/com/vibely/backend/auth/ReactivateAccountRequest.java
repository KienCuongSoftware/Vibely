package com.vibely.backend.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class ReactivateAccountRequest {

    @NotBlank(message = "Phiên kích hoạt lại tài khoản là bắt buộc")
    private String reactivationToken;

    @NotBlank(message = "Mã xác minh là bắt buộc")
    @Pattern(regexp = "\\d{6}", message = "Mã xác minh phải gồm 6 chữ số")
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
