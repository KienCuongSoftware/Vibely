package com.vibely.backend.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public class SendCodeRequest {

    @Email(message = "Email không hợp lệ")
    @NotBlank(message = "Email là bắt buộc")
    private String email;

    private boolean challengePassed;

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public boolean isChallengePassed() {
        return challengePassed;
    }

    public void setChallengePassed(boolean challengePassed) {
        this.challengePassed = challengePassed;
    }
}
