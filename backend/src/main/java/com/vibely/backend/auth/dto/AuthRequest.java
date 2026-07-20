package com.vibely.backend.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class AuthRequest {

    /**
     * Login identifier: email address or VibelyID (username). Kept as {@code email} in JSON
     * for API compatibility; not restricted to email format.
     */
    @NotBlank(message = "Email hoặc VibelyID là bắt buộc")
    @Size(max = 255, message = "Email hoặc VibelyID không hợp lệ")
    private String email;

    @NotBlank(message = "Mật khẩu là bắt buộc")
    @Size(min = 6, max = 100, message = "Mật khẩu phải từ 6 đến 100 ký tự")
    private String password;

    private LoginContextRequest loginContext;

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public LoginContextRequest getLoginContext() {
        return loginContext;
    }

    public void setLoginContext(LoginContextRequest loginContext) {
        this.loginContext = loginContext;
    }
}
