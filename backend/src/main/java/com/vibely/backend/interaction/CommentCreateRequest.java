package com.vibely.backend.interaction;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class CommentCreateRequest {

    @NotBlank(message = "Nội dung bình luận là bắt buộc")
    @Size(max = 150, message = "Bình luận tối đa 150 ký tự")
    private String content;

    /** Trả lời một bình luận khác trên cùng video (nullable). */
    private Long parentCommentId;

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public Long getParentCommentId() {
        return parentCommentId;
    }

    public void setParentCommentId(Long parentCommentId) {
        this.parentCommentId = parentCommentId;
    }
}
