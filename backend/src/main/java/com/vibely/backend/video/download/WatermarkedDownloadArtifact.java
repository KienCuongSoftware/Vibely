package com.vibely.backend.video.download;

import java.nio.file.Path;

/**
 * Either a cached object in S3 or a freshly rendered local MP4 (with temp work directory).
 */
public record WatermarkedDownloadArtifact(
    String bucket,
    String key,
    Path localFile,
    Path workRoot
) {
    public boolean cachedInS3() {
        return bucket != null && !bucket.isBlank() && key != null && !key.isBlank();
    }

    public boolean hasLocalFile() {
        return localFile != null;
    }
}
