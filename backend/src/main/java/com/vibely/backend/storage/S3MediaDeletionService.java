package com.vibely.backend.storage;

import com.vibely.backend.common.StorageDeletionException;
import com.vibely.backend.video.Video;
import com.vibely.backend.video.VideoRepository;
import com.vibely.backend.video.VideoStatus;
import com.vibely.backend.video.download.VideoWatermarkDownloadService;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.Delete;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.DeleteObjectsRequest;
import software.amazon.awssdk.services.s3.model.DeleteObjectsResponse;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Request;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Response;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.ObjectIdentifier;
import software.amazon.awssdk.services.s3.model.S3Error;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.model.S3Object;

@Service
@ConditionalOnProperty(prefix = "app.s3", name = "enabled", havingValue = "true")
public class S3MediaDeletionService {

    private static final Logger log = LoggerFactory.getLogger(S3MediaDeletionService.class);
    private static final int DELETE_BATCH_SIZE = 1000;
    private static final Pattern VIDEO_EXT = Pattern.compile("\\.(mp4|webm|mov)$", Pattern.CASE_INSENSITIVE);

    private final S3Client s3Client;
    private final S3Properties properties;
    private final S3ObjectUrlBuilder objectUrlBuilder;
    private final VideoRepository videoRepository;

    public S3MediaDeletionService(
        S3Client s3Client,
        S3Properties properties,
        S3ObjectUrlBuilder objectUrlBuilder,
        VideoRepository videoRepository
    ) {
        this.s3Client = s3Client;
        this.properties = properties;
        this.objectUrlBuilder = objectUrlBuilder;
        this.videoRepository = videoRepository;
    }

    public static String hlsPrefixFor(long authorId, UUID publicId) {
        return "hls/" + authorId + "/" + publicId + "/";
    }

    public static String authorUploadsPrefix(long authorId) {
        return "uploads/" + authorId + "/";
    }

    public static String authorThumbnailsPrefix(long authorId) {
        return "thumbnails/" + authorId + "/";
    }

    public static String authorAudiosPrefix(long authorId) {
        return "audios/" + authorId + "/";
    }

    public static String authorHlsPrefix(long authorId) {
        return "hls/" + authorId + "/";
    }

    /**
     * Deletes raw upload, thumbnail, audio track, and all HLS objects for a video.
     */
    public void deleteVideoArtifacts(Video video) {
        long authorId = video.getAuthor().getId();
        UUID publicId = video.getPublicId();
        String bucket = properties.getBucket();
        if (bucket == null || bucket.isBlank()) {
            throw new StorageDeletionException("Bucket S3 chưa được cấu hình.");
        }

        boolean lastActiveVideoForAuthor = videoRepository.countByAuthor_IdAndStatusNotAndIdNot(
            authorId,
            VideoStatus.REMOVED,
            video.getId()
        ) == 0;

        Set<String> objectKeys = new LinkedHashSet<>();
        collectObjectKey(objectKeys, video.getVideoUrl(), authorUploadsPrefix(authorId));
        collectObjectKey(objectKeys, video.getThumbnailUrl(), authorThumbnailsPrefix(authorId));
        collectObjectKey(objectKeys, video.getMasterPlaylistUrl(), authorHlsPrefix(authorId));
        objectKeys.add(VideoWatermarkDownloadService.cacheKeyFor(publicId));

        if (isAudioExclusiveToVideo(video)) {
            collectObjectKey(objectKeys, video.getAudioUrl(), authorAudiosPrefix(authorId));
            resolveKeyFromUrl(video.getVideoUrl())
                .map(S3MediaDeletionService::deriveAudioKeyFromUploadKey)
                .ifPresent(key -> {
                    if (key.startsWith(authorAudiosPrefix(authorId))) {
                        objectKeys.add(key);
                    }
                });
        }

        int deleted = 0;
        for (String key : objectKeys) {
            deleteObject(bucket, key);
            deleted++;
        }
        deleted += deletePrefix(bucket, hlsPrefixFor(authorId, publicId), authorHlsPrefix(authorId));

        if (lastActiveVideoForAuthor) {
            deleted += deletePrefix(bucket, authorThumbnailsPrefix(authorId), authorThumbnailsPrefix(authorId));
            deleted += deletePrefix(bucket, authorUploadsPrefix(authorId), authorUploadsPrefix(authorId));
            deleted += deletePrefix(bucket, authorAudiosPrefix(authorId), authorAudiosPrefix(authorId));
            deleted += deletePrefix(bucket, authorHlsPrefix(authorId), authorHlsPrefix(authorId));
        }

        cleanupEmptyFolderMarkers(
            bucket,
            authorThumbnailsPrefix(authorId),
            "thumbnails/",
            authorAudiosPrefix(authorId),
            "audios/",
            authorUploadsPrefix(authorId),
            "uploads/",
            authorHlsPrefix(authorId),
            "hls/"
        );

        log.info(
            "Deleted {} S3 object(s) for video id={} publicId={} authorId={} lastAuthorVideo={}",
            deleted,
            video.getId(),
            publicId,
            authorId,
            lastActiveVideoForAuthor
        );
    }

    /**
     * Deletes a raw upload (+ derived audio key) and optional thumbnail owned by authorId.
     * Used when rejecting an upload before / without a persisted Video row.
     */
    public void deleteOwnedUploadMedia(long authorId, String videoUrl, String thumbnailUrl) {
        String bucket = properties.getBucket();
        if (bucket == null || bucket.isBlank()) {
            return;
        }
        Set<String> objectKeys = new LinkedHashSet<>();
        collectObjectKey(objectKeys, videoUrl, authorUploadsPrefix(authorId));
        collectObjectKey(objectKeys, thumbnailUrl, authorThumbnailsPrefix(authorId));
        resolveKeyFromUrl(videoUrl)
            .map(S3MediaDeletionService::deriveAudioKeyFromUploadKey)
            .ifPresent(key -> {
                if (key != null && key.startsWith(authorAudiosPrefix(authorId))) {
                    objectKeys.add(key);
                }
            });
        for (String key : objectKeys) {
            deleteObject(bucket, key);
        }
        log.info(
            "Deleted {} orphan upload object(s) for authorId={} videoUrl={}",
            objectKeys.size(),
            authorId,
            videoUrl
        );
    }

    public static String deriveAudioKeyFromUploadKey(String uploadKey) {
        if (uploadKey == null || uploadKey.isBlank()) {
            return null;
        }
        String normalized = uploadKey.trim();
        if (!normalized.startsWith("uploads/")) {
            return null;
        }
        String mp3 = VIDEO_EXT.matcher(normalized).replaceFirst(".mp3");
        if (mp3.equals(normalized)) {
            return null;
        }
        return mp3.replaceFirst("^uploads/", "audios/");
    }

    private boolean isAudioExclusiveToVideo(Video video) {
        String audioUrl = video.getAudioUrl();
        if (audioUrl == null || audioUrl.isBlank()) {
            return false;
        }
        return videoRepository.countByIdNotAndStatusNotAndAudioUrl(
            video.getId(),
            VideoStatus.REMOVED,
            audioUrl.trim()
        ) == 0;
    }

    private void collectObjectKey(Set<String> keys, String url, String requiredPrefix) {
        resolveKeyFromUrl(url)
            .filter(key -> key.startsWith(requiredPrefix))
            .ifPresentOrElse(
                keys::add,
                () -> {
                    if (url != null && !url.isBlank()) {
                        log.warn(
                            "Skip S3 delete — cannot resolve key from URL (prefix {}): {}",
                            requiredPrefix,
                            url
                        );
                    }
                }
            );
    }

    private Optional<String> resolveKeyFromUrl(String url) {
        return objectUrlBuilder.resolveKeyLenient(url);
    }

    private int deletePrefix(String bucket, String prefix, String requiredRoot) {
        if (!prefix.startsWith(requiredRoot)) {
            throw new StorageDeletionException("Prefix S3 không hợp lệ: " + prefix);
        }
        int deleted = 0;
        String continuationToken = null;
        do {
            ListObjectsV2Request.Builder listBuilder = ListObjectsV2Request.builder()
                .bucket(bucket)
                .prefix(prefix);
            if (continuationToken != null) {
                listBuilder.continuationToken(continuationToken);
            }
            ListObjectsV2Response listing = s3Client.listObjectsV2(listBuilder.build());
            List<ObjectIdentifier> keys = new ArrayList<>();
            for (S3Object object : listing.contents()) {
                String key = object.key();
                if (key.equals(prefix)) {
                    continue;
                }
                keys.add(ObjectIdentifier.builder().key(key).build());
            }
            deleted += deleteObjectBatch(bucket, keys);
            continuationToken = listing.isTruncated() ? listing.nextContinuationToken() : null;
        } while (continuationToken != null);
        return deleted;
    }

    private void cleanupEmptyFolderMarkers(String bucket, String... prefixes) {
        for (String prefix : prefixes) {
            if (prefix == null || prefix.isBlank()) {
                continue;
            }
            String normalized = prefix.endsWith("/") ? prefix : prefix + "/";
            if (!hasAnyObjectUnderPrefix(bucket, normalized)) {
                deleteObject(bucket, normalized);
            }
        }
    }

    private boolean hasAnyObjectUnderPrefix(String bucket, String prefix) {
        ListObjectsV2Response listing = s3Client.listObjectsV2(
            ListObjectsV2Request.builder()
                .bucket(bucket)
                .prefix(prefix)
                .maxKeys(1)
                .build()
        );
        return listing.hasContents() && !listing.contents().isEmpty();
    }

    private void deleteObject(String bucket, String key) {
        try {
            s3Client.deleteObject(
                DeleteObjectRequest.builder().bucket(bucket).key(key).build()
            );
        } catch (NoSuchKeyException ex) {
            // already gone
        } catch (S3Exception ex) {
            if (ex.statusCode() == 404) {
                return;
            }
            throw new StorageDeletionException("Không thể xóa file trên kho lưu trữ.", ex);
        }
    }

    private int deleteObjectBatch(String bucket, List<ObjectIdentifier> keys) {
        if (keys.isEmpty()) {
            return 0;
        }
        Set<String> seen = new HashSet<>();
        List<ObjectIdentifier> unique = new ArrayList<>();
        for (ObjectIdentifier key : keys) {
            if (seen.add(key.key())) {
                unique.add(key);
            }
        }
        int deleted = 0;
        for (int offset = 0; offset < unique.size(); offset += DELETE_BATCH_SIZE) {
            List<ObjectIdentifier> batch = unique.subList(
                offset,
                Math.min(offset + DELETE_BATCH_SIZE, unique.size())
            );
            DeleteObjectsResponse response = s3Client.deleteObjects(
                DeleteObjectsRequest.builder()
                    .bucket(bucket)
                    .delete(Delete.builder().objects(batch).build())
                    .build()
            );
            if (response.hasErrors() && !response.errors().isEmpty()) {
                S3Error first = response.errors().get(0);
                throw new StorageDeletionException(
                    "Không thể xóa file trên kho lưu trữ: " + first.key() + " (" + first.message() + ")"
                );
            }
            deleted += batch.size();
        }
        return deleted;
    }
}
