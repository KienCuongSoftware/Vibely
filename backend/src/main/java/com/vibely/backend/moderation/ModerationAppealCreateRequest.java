package com.vibely.backend.moderation;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class ModerationAppealCreateRequest {

    @NotBlank
    @Size(min = 10, max = 2000)
    private String appealText;

    public String getAppealText() {
        return appealText;
    }

    public void setAppealText(String appealText) {
        this.appealText = appealText;
    }
}
