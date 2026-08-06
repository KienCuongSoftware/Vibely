package com.vibely.backend.storage;

public class MultipartInitiateResponse {

    private final String uploadId;
    private final String objectKey;
    private final String playbackUrl;
    private final String contentType;
    private final long partSizeBytes;
    private final long expiresAtEpochMillis;

    public MultipartInitiateResponse(
        String uploadId,
        String objectKey,
        String playbackUrl,
        String contentType,
        long partSizeBytes,
        long expiresAtEpochMillis
    ) {
        this.uploadId = uploadId;
        this.objectKey = objectKey;
        this.playbackUrl = playbackUrl;
        this.contentType = contentType;
        this.partSizeBytes = partSizeBytes;
        this.expiresAtEpochMillis = expiresAtEpochMillis;
    }

    public String getUploadId() {
        return uploadId;
    }

    public String getObjectKey() {
        return objectKey;
    }

    public String getPlaybackUrl() {
        return playbackUrl;
    }

    public String getContentType() {
        return contentType;
    }

    public long getPartSizeBytes() {
        return partSizeBytes;
    }

    public long getExpiresAtEpochMillis() {
        return expiresAtEpochMillis;
    }
}
