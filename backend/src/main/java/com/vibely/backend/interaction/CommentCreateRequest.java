package com.vibely.backend.interaction;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class CommentCreateRequest {

    @NotBlank(message = "Nội dung bình luận là bắt buộc")
    @Size(max = 500, message = "Bình luận tối đa 500 ký tự")
    private String content;

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }
}
