package com.vibely.backend.chat;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class SendChatMessageRequest {

    @NotBlank(message = "Nội dung tin nhắn là bắt buộc")
    @Size(max = 1000, message = "Tin nhắn tối đa 1000 ký tự")
    private String content;

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }
}
