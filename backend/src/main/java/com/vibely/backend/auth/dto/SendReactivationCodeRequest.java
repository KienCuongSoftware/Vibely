package com.vibely.backend.auth.dto;

import jakarta.validation.constraints.NotBlank;

public class SendReactivationCodeRequest {

    @NotBlank(message = "Account reactivation session is required")
    private String reactivationToken;

    private LoginContextRequest loginContext;

    public String getReactivationToken() {
        return reactivationToken;
    }

    public void setReactivationToken(String reactivationToken) {
        this.reactivationToken = reactivationToken;
    }

    public LoginContextRequest getLoginContext() {
        return loginContext;
    }

    public void setLoginContext(LoginContextRequest loginContext) {
        this.loginContext = loginContext;
    }
}
