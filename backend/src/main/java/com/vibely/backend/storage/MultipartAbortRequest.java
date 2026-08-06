package com.vibely.backend.storage;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class MultipartAbortRequest {

    @NotBlank(message = "uploadId là bắt buộc")
    private String uploadId;

    @NotBlank(message = "objectKey là bắt buộc")
    @Size(max = 512)
    private String objectKey;

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
}
