package com.vibely.backend.storage;

public class MultipartPresignedPart {

    private final int partNumber;
    private final String uploadUrl;

    public MultipartPresignedPart(int partNumber, String uploadUrl) {
        this.partNumber = partNumber;
        this.uploadUrl = uploadUrl;
    }

    public int getPartNumber() {
        return partNumber;
    }

    public String getUploadUrl() {
        return uploadUrl;
    }
}
