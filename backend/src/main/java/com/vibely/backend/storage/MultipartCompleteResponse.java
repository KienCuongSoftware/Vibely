package com.vibely.backend.storage;

public class MultipartCompleteResponse {

    private final String playbackUrl;
    private final String objectKey;

    public MultipartCompleteResponse(String playbackUrl, String objectKey) {
        this.playbackUrl = playbackUrl;
        this.objectKey = objectKey;
    }

    public String getPlaybackUrl() {
        return playbackUrl;
    }

    public String getObjectKey() {
        return objectKey;
    }
}
