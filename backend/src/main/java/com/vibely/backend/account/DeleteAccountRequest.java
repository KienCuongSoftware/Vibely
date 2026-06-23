package com.vibely.backend.account;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class DeleteAccountRequest {

    @NotBlank(message = "Mã xác minh là bắt buộc")
    @Pattern(regexp = "\\d{6}", message = "Mã xác minh phải gồm 6 chữ số")
    private String code;

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }
}
