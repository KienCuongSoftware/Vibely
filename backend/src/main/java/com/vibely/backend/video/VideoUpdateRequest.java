package com.vibely.backend.video;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class VideoUpdateRequest {

    @NotBlank(message = "Tiêu đề là bắt buộc")
    @Size(max = 120, message = "Tiêu đề tối đa 120 ký tự")
    private String title;

    @Size(max = 1000, message = "Mô tả tối đa 1000 ký tự")
    private String description;

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}
