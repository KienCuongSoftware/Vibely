package com.vibely.backend.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public class SendCodeRequest {

    @Email(message = "Invalid email")
    @NotBlank(message = "Email is required")
    private String email;

    /** Ignored by the server — captcha must be a real verification token when antibot is on. */
    private boolean challengePassed;

    /** REGISTER (mặc định) hoặc PASSWORD_RESET */
    private String purpose;

    /** UI language (e.g. en, vi) — used to localize OTP email. */
    private String locale;

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

    public String getPurpose() {
        return purpose;
    }

    public void setPurpose(String purpose) {
        this.purpose = purpose;
    }

    public String getLocale() {
        return locale;
    }

    public void setLocale(String locale) {
        this.locale = locale;
    }
}
