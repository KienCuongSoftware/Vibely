package com.vibely.backend.storage;

public class PresignedUploadResponse {

    private final String uploadUrl;
    private final String method;
    private final String contentType;
    private final String objectKey;
    private final String playbackUrl;
    private final long expiresAtEpochMillis;

    public PresignedUploadResponse(
        String uploadUrl,
        String method,
        String contentType,
        String objectKey,
        String playbackUrl,
        long expiresAtEpochMillis
    ) {
        this.uploadUrl = uploadUrl;
        this.method = method;
        this.contentType = contentType;
        this.objectKey = objectKey;
        this.playbackUrl = playbackUrl;
        this.expiresAtEpochMillis = expiresAtEpochMillis;
    }

    public String getUploadUrl() {
        return uploadUrl;
    }

    public String getMethod() {
        return method;
    }

    public String getContentType() {
        return contentType;
    }

    public String getObjectKey() {
        return objectKey;
    }

    public String getPlaybackUrl() {
        return playbackUrl;
    }

    public long getExpiresAtEpochMillis() {
        return expiresAtEpochMillis;
    }
}
