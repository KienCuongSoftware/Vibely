package com.vibely.backend.storage;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public class MultipartCompletedPartDto {

    @Min(1)
    @Max(10000)
    private int partNumber;

    @NotBlank(message = "etag là bắt buộc")
    @jakarta.validation.constraints.Size(max = 200)
    private String etag;

    public int getPartNumber() {
        return partNumber;
    }

    public void setPartNumber(int partNumber) {
        this.partNumber = partNumber;
    }

    public String getEtag() {
        return etag;
    }

    public void setEtag(String etag) {
        this.etag = etag;
    }
}
