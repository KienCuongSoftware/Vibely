package com.vibely.backend.auth.dto;

import jakarta.validation.constraints.NotBlank;

public class NativeOAuthRequest {

    @NotBlank
    private String provider;

    private String idToken;

    private String accessToken;

    public String getProvider() {
        return provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public String getIdToken() {
        return idToken;
    }

    public void setIdToken(String idToken) {
        this.idToken = idToken;
    }

    public String getAccessToken() {
        return accessToken;
    }

    public void setAccessToken(String accessToken) {
        this.accessToken = accessToken;
    }
}
