package com.vibely.backend.storage;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.ArrayList;
import java.util.List;

public class MultipartPresignPartsRequest {

    @NotBlank(message = "uploadId is required")
    private String uploadId;

    @NotBlank(message = "objectKey is required")
    @Size(max = 512)
    private String objectKey;

    @NotEmpty(message = "partNumbers list cannot be empty")
    @Size(max = 50, message = "Maximum 50 parts per signing request")
    private List<Integer> partNumbers = new ArrayList<>();

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

    public List<Integer> getPartNumbers() {
        return partNumbers;
    }

    public void setPartNumbers(List<Integer> partNumbers) {
        this.partNumbers = partNumbers != null ? partNumbers : new ArrayList<>();
    }
}
