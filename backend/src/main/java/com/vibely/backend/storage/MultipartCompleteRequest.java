package com.vibely.backend.storage;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.ArrayList;
import java.util.List;

public class MultipartCompleteRequest {

    @NotBlank(message = "uploadId is required")
    private String uploadId;

    @NotBlank(message = "objectKey is required")
    @Size(max = 512)
    private String objectKey;

    @NotEmpty(message = "Parts list cannot be empty")
    @Size(max = 10000)
    @Valid
    private List<MultipartCompletedPartDto> parts = new ArrayList<>();

    public String getUploadId() {
        return uploadId;
    }

    public void setUploadId(String uploadId) {
        this.uploadId = uploadId;
    }

    public String getObjectKey() {
        return objectKey;
    }

    public void setObjectKey(String objectKey) {
        this.objectKey = objectKey;
    }

    public List<MultipartCompletedPartDto> getParts() {
        return parts;
    }

    public void setParts(List<MultipartCompletedPartDto> parts) {
        this.parts = parts != null ? parts : new ArrayList<>();
    }
}
