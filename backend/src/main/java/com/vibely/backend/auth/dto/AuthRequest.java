package com.vibely.backend.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class AuthRequest {

    /**
     * Login identifier: email address or VibelyID (username). Kept as {@code email} in JSON
     * for API compatibility; not restricted to email format.
     */
    @NotBlank(message = "Email or VibelyID is required")
    @Size(max = 255, message = "Invalid email or VibelyID")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 6, max = 100, message = "Password must be between 6 and 100 characters")
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
