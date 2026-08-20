package com.vibely.backend.chat;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class SendChatMessageRequest {

    @NotBlank(message = "Message content is required")
    @Size(max = 1000, message = "Message must be at most 1000 characters")
    private String content;

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }
}
