package com.vibely.backend.storage;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Component;

@Component
public class MediaUrlPresigner {

    private final ObjectProvider<S3PresignedUploadService> presignedUploadService;

    public MediaUrlPresigner(ObjectProvider<S3PresignedUploadService> presignedUploadService) {
        this.presignedUploadService = presignedUploadService;
    }

    public String presignPlaybackUrl(String url) {
        if (url == null || url.isBlank()) {
            return url;
        }
        S3PresignedUploadService svc = presignedUploadService.getIfAvailable();
        if (svc == null) {
            return url;
        }
        return svc.presignGetForPlayback(url).orElse(url);
    }
}
