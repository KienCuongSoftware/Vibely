package com.vibely.backend.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public class SendReactivationCodeRequest {

    @Email(message = "Email không hợp lệ")
    @NotBlank(message = "Email là bắt buộc")
    private String email;

    private LoginContextRequest loginContext;

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public LoginContextRequest getLoginContext() {
        return loginContext;
    }

    public void setLoginContext(LoginContextRequest loginContext) {
        this.loginContext = loginContext;
    }
}
