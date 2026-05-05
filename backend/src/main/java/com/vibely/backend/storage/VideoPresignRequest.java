package com.vibely.backend.storage;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class VideoPresignRequest {

    @NotBlank(message = "Content-Type là bắt buộc")
    private String contentType;

    @Size(max = 220)
    private String fileName;

    public String getContentType() {
        return contentType;
    }

    public void setContentType(String contentType) {
        this.contentType = contentType;
    }

    public String getFileName() {
        return fileName;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }
}
