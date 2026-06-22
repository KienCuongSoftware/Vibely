package com.vibely.backend.auth;

import jakarta.validation.constraints.NotBlank;

public class SendReactivationCodeRequest {

    @NotBlank(message = "Phiên kích hoạt lại tài khoản là bắt buộc")
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
