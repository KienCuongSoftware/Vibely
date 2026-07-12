package com.vibely.backend.storage;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public class VideoPresignRequest {

    @NotBlank(message = "Content-Type là bắt buộc")
    private String contentType;

    @Size(max = 220)
    private String fileName;

    /** Client-reported size; required for video uploads so S3 PUT is capped. */
    @Positive(message = "Kích thước tệp phải lớn hơn 0")
    private Long fileSizeBytes;

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

    public Long getFileSizeBytes() {
        return fileSizeBytes;
    }

    public void setFileSizeBytes(Long fileSizeBytes) {
        this.fileSizeBytes = fileSizeBytes;
    }
}
