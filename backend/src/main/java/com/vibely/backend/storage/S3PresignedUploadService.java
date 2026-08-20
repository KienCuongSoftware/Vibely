package com.vibely.backend.storage;

import com.vibely.backend.common.BadRequestException;
import com.vibely.backend.common.NotFoundException;
import com.vibely.backend.user.repository.UserRepository;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.AbortMultipartUploadRequest;
import software.amazon.awssdk.services.s3.model.CompleteMultipartUploadRequest;
import software.amazon.awssdk.services.s3.model.CompletedMultipartUpload;
import software.amazon.awssdk.services.s3.model.CompletedPart;
import software.amazon.awssdk.services.s3.model.CreateMultipartUploadRequest;
import software.amazon.awssdk.services.s3.model.CreateMultipartUploadResponse;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.UploadPartRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedUploadPartRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.UploadPartPresignRequest;

@Service
@ConditionalOnProperty(prefix = "app.s3", name = "enabled", havingValue = "true")
public class S3PresignedUploadService {

    /** Matches Studio Upload copy: max 30 GB per video. */
    private static final long MAX_VIDEO_UPLOAD_BYTES = 30L * 1024 * 1024 * 1024;
    /** Multipart part size advertised to clients (S3 min 5 MiB except last part). */
    public static final long MULTIPART_PART_SIZE_BYTES = 16L * 1024 * 1024;
    private static final int MAX_PRESIGN_PARTS_PER_REQUEST = 50;
    private static final int MAX_S3_PART_NUMBER = 10_000;

    private static final Map<String, String> MIME_TO_EXT = Map.of(
        "video/mp4", ".mp4",
        "video/webm", ".webm",
        "video/quicktime", ".mov"
    );
    private static final Set<String> ALLOWED_CONTENT_TYPES = MIME_TO_EXT.keySet();
    private static final Pattern SAFE_EXT = Pattern.compile("\\.(mp4|webm|mov)$", Pattern.CASE_INSENSITIVE);

    private static final Map<String, String> THUMB_MIME_TO_EXT = Map.of(
        "image/jpeg", ".jpg",
        "image/png", ".png",
        "image/webp", ".webp"
    );
    private static final Set<String> THUMB_CONTENT_TYPES = THUMB_MIME_TO_EXT.keySet();
    private static final Pattern THUMB_SAFE_EXT = Pattern.compile("\\.(jpe?g|png|webp)$", Pattern.CASE_INSENSITIVE);

    private final S3Presigner presigner;
    private final S3Client s3Client;
    private final S3Properties properties;
    private final S3ObjectUrlBuilder objectUrlBuilder;
    private final UserRepository userRepository;

    public S3PresignedUploadService(
        S3Presigner presigner,
        S3Client s3Client,
        S3Properties properties,
        S3ObjectUrlBuilder objectUrlBuilder,
        UserRepository userRepository
    ) {
        this.presigner = presigner;
        this.s3Client = s3Client;
        this.properties = properties;
        this.objectUrlBuilder = objectUrlBuilder;
        this.userRepository = userRepository;
    }

    public PresignedUploadResponse presign(String userEmail, VideoPresignRequest request) {
        requireBucketConfigured();
        String contentType = normalizeContentType(request.getContentType());
        if (!ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new BadRequestException("Only MP4, WebM, or MOV videos are accepted.");
        }
        long fileSizeBytes = requireValidVideoFileSize(request.getFileSizeBytes());
        String extension = resolveExtension(request.getFileName(), contentType);
        long authorId = resolveAuthorId(userEmail);
        String key = "uploads/" + authorId + "/" + UUID.randomUUID() + extension;

        PutObjectRequest put = PutObjectRequest.builder()
            .bucket(properties.getBucket())
            .key(key)
            .contentType(contentType)
            .contentLength(fileSizeBytes)
            .build();

        Instant expiresAt = Instant.now().plus(properties.getPresignExpirationMinutes(), ChronoUnit.MINUTES);
        PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
            .signatureDuration(Duration.ofMinutes(properties.getPresignExpirationMinutes()))
            .putObjectRequest(put)
            .build();

        PresignedPutObjectRequest presigned = presigner.presignPutObject(presignRequest);
        String playbackUrl = objectUrlBuilder.toPublicHttpsUrl(key);

        return new PresignedUploadResponse(
            presigned.url().toString(),
            "PUT",
            contentType,
            key,
            playbackUrl,
            expiresAt.toEpochMilli()
        );
    }

    public MultipartInitiateResponse initiateMultipart(String userEmail, VideoPresignRequest request) {
        requireBucketConfigured();
        String contentType = normalizeContentType(request.getContentType());
        if (!ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new BadRequestException("Only MP4, WebM, or MOV videos are accepted.");
        }
        requireValidVideoFileSize(request.getFileSizeBytes());
        String extension = resolveExtension(request.getFileName(), contentType);
        long authorId = resolveAuthorId(userEmail);
        String key = "uploads/" + authorId + "/" + UUID.randomUUID() + extension;

        CreateMultipartUploadResponse created = s3Client.createMultipartUpload(
            CreateMultipartUploadRequest.builder()
                .bucket(properties.getBucket())
                .key(key)
                .contentType(contentType)
                .build()
        );

        Instant expiresAt = Instant.now().plus(properties.getPresignExpirationMinutes(), ChronoUnit.MINUTES);
        return new MultipartInitiateResponse(
            created.uploadId(),
            key,
            objectUrlBuilder.toPublicHttpsUrl(key),
            contentType,
            MULTIPART_PART_SIZE_BYTES,
            expiresAt.toEpochMilli()
        );
    }

    public MultipartPresignPartsResponse presignMultipartParts(
        String userEmail,
        MultipartPresignPartsRequest request
    ) {
        requireBucketConfigured();
        String objectKey = requireOwnedUploadKey(userEmail, request.getObjectKey());
        String uploadId = requireNonBlank(request.getUploadId(), "uploadId");
        List<Integer> partNumbers = request.getPartNumbers();
        if (partNumbers == null || partNumbers.isEmpty()) {
            throw new BadRequestException("partNumbers list cannot be empty.");
        }
        if (partNumbers.size() > MAX_PRESIGN_PARTS_PER_REQUEST) {
            throw new BadRequestException("Maximum " + MAX_PRESIGN_PARTS_PER_REQUEST + " parts per signing request.");
        }

        Set<Integer> seen = new HashSet<>();
        Instant expiresAt = Instant.now().plus(properties.getPresignExpirationMinutes(), ChronoUnit.MINUTES);
        List<MultipartPresignedPart> parts = new ArrayList<>(partNumbers.size());
        for (Integer rawPart : partNumbers) {
            if (rawPart == null) {
                throw new BadRequestException("Invalid partNumber");
            }
            int partNumber = rawPart;
            if (partNumber < 1 || partNumber > MAX_S3_PART_NUMBER) {
                throw new BadRequestException("partNumber must be between 1 and " + MAX_S3_PART_NUMBER + ".");
            }
            if (!seen.add(partNumber)) {
                throw new BadRequestException("Duplicate partNumber: " + partNumber);
            }
            UploadPartRequest uploadPart = UploadPartRequest.builder()
                .bucket(properties.getBucket())
                .key(objectKey)
                .uploadId(uploadId)
                .partNumber(partNumber)
                .build();
            UploadPartPresignRequest presignRequest = UploadPartPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(properties.getPresignExpirationMinutes()))
                .uploadPartRequest(uploadPart)
                .build();
            PresignedUploadPartRequest presigned = presigner.presignUploadPart(presignRequest);
            parts.add(new MultipartPresignedPart(partNumber, presigned.url().toString()));
        }
        return new MultipartPresignPartsResponse(parts, expiresAt.toEpochMilli());
    }

    public MultipartCompleteResponse completeMultipart(String userEmail, MultipartCompleteRequest request) {
        requireBucketConfigured();
        String objectKey = requireOwnedUploadKey(userEmail, request.getObjectKey());
        String uploadId = requireNonBlank(request.getUploadId(), "uploadId");
        List<MultipartCompletedPartDto> dtoParts = request.getParts();
        if (dtoParts == null || dtoParts.isEmpty()) {
            throw new BadRequestException("Parts list cannot be empty.");
        }

        Set<Integer> seen = new HashSet<>();
        List<CompletedPart> completedParts = new ArrayList<>(dtoParts.size());
        for (MultipartCompletedPartDto dto : dtoParts) {
            if (dto == null) {
                throw new BadRequestException("Invalid Part");
            }
            int partNumber = dto.getPartNumber();
            if (partNumber < 1 || partNumber > MAX_S3_PART_NUMBER) {
                throw new BadRequestException("partNumber must be between 1 and " + MAX_S3_PART_NUMBER + ".");
            }
            if (!seen.add(partNumber)) {
                throw new BadRequestException("Duplicate partNumber: " + partNumber);
            }
            String etag = normalizeEtag(dto.getEtag());
            if (etag.isEmpty()) {
                throw new BadRequestException("etag is required.");
            }
            completedParts.add(
                CompletedPart.builder()
                    .partNumber(partNumber)
                    .eTag(etag)
                    .build()
            );
        }
        completedParts.sort(Comparator.comparingInt(CompletedPart::partNumber));

        s3Client.completeMultipartUpload(
            CompleteMultipartUploadRequest.builder()
                .bucket(properties.getBucket())
                .key(objectKey)
                .uploadId(uploadId)
                .multipartUpload(
                    CompletedMultipartUpload.builder()
                        .parts(completedParts)
                        .build()
                )
                .build()
        );

        return new MultipartCompleteResponse(objectUrlBuilder.toPublicHttpsUrl(objectKey), objectKey);
    }

    public void abortMultipart(String userEmail, MultipartAbortRequest request) {
        requireBucketConfigured();
        String objectKey = requireOwnedUploadKey(userEmail, request.getObjectKey());
        String uploadId = requireNonBlank(request.getUploadId(), "uploadId");
        try {
            s3Client.abortMultipartUpload(
                AbortMultipartUploadRequest.builder()
                    .bucket(properties.getBucket())
                    .key(objectKey)
                    .uploadId(uploadId)
                    .build()
            );
        } catch (RuntimeException ignored) {
            // Best-effort cleanup when the client cancels or abandons an upload.
        }
    }

    /**
     * Presign PUT cho ảnh bìa (JPG, PNG, WebP), key dưới thư mục thumbnails/.
     */
    public PresignedUploadResponse presignThumbnail(String userEmail, VideoPresignRequest request) {
        requireBucketConfigured();
        String contentType = normalizeContentType(request.getContentType());
        if ("image/jpg".equals(contentType)) {
            contentType = "image/jpeg";
        }
        if (!THUMB_CONTENT_TYPES.contains(contentType)) {
            throw new BadRequestException("Only JPG, PNG, or WebP images are accepted.");
        }
        String extension = resolveThumbExtension(request.getFileName(), contentType);
        long authorId = resolveAuthorId(userEmail);
        String key = "thumbnails/" + authorId + "/" + UUID.randomUUID() + extension;

        PutObjectRequest put = PutObjectRequest.builder()
            .bucket(properties.getBucket())
            .key(key)
            .contentType(contentType)
            .build();

        Instant expiresAt = Instant.now().plus(properties.getPresignExpirationMinutes(), ChronoUnit.MINUTES);
        PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
            .signatureDuration(Duration.ofMinutes(properties.getPresignExpirationMinutes()))
            .putObjectRequest(put)
            .build();

        PresignedPutObjectRequest presigned = presigner.presignPutObject(presignRequest);
        String publicUrl = objectUrlBuilder.toPublicHttpsUrl(key);

        return new PresignedUploadResponse(
            presigned.url().toString(),
            "PUT",
            contentType,
            key,
            publicUrl,
            expiresAt.toEpochMilli()
        );
    }

    /**
     * Presigned GET so the browser can load {@code uploads/…} or {@code thumbnails/…} from a private bucket.
     */
    public Optional<String> presignGetForPlayback(String storedPublicUrl) {
        int hours = properties.getPlaybackPresignExpiryHours();
        if (hours <= 0 || storedPublicUrl == null || storedPublicUrl.isBlank()) {
            return Optional.empty();
        }
        Optional<ResolvedS3Object> resolved = objectUrlBuilder.resolveObjectFromUrl(storedPublicUrl.trim());
        if (resolved.isEmpty()) {
            return Optional.empty();
        }
        ResolvedS3Object obj = resolved.get();
        String cfgBucket = properties.getBucket();
        if (cfgBucket == null || cfgBucket.isBlank() || !cfgBucket.equalsIgnoreCase(obj.bucket())) {
            return Optional.empty();
        }
        int safeHours = Math.min(Math.max(hours, 1), 168);
        GetObjectRequest get = GetObjectRequest.builder()
            .bucket(obj.bucket())
            .key(obj.key())
            .build();
        GetObjectPresignRequest pr = GetObjectPresignRequest.builder()
            .signatureDuration(Duration.ofHours(safeHours))
            .getObjectRequest(get)
            .build();
        PresignedGetObjectRequest signed = presigner.presignGetObject(pr);
        return Optional.of(signed.url().toString());
    }

    private void requireBucketConfigured() {
        if (properties.getBucket() == null || properties.getBucket().isBlank()) {
            throw new BadRequestException("AWS_S3_BUCKET is not configured.");
        }
    }

    private long resolveAuthorId(String userEmail) {
        return userRepository.findByEmail(userEmail)
            .orElseThrow(() -> new NotFoundException("User not found"))
            .getId();
    }

    private String requireOwnedUploadKey(String userEmail, String objectKey) {
        String key = requireNonBlank(objectKey, "objectKey");
        if (key.contains("..") || key.startsWith("/") || key.contains("//")) {
            throw new BadRequestException("Invalid objectKey");
        }
        long authorId = resolveAuthorId(userEmail);
        String prefix = "uploads/" + authorId + "/";
        if (!key.startsWith(prefix)) {
            throw new BadRequestException("objectKey does not belong to your upload session.");
        }
        return key;
    }

    private static String requireNonBlank(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new BadRequestException(field + " is required.");
        }
        return value.trim();
    }

    private static String normalizeEtag(String raw) {
        if (raw == null) {
            return "";
        }
        String etag = raw.trim();
        if (etag.length() >= 2 && etag.startsWith("\"") && etag.endsWith("\"")) {
            etag = etag.substring(1, etag.length() - 1);
        }
        return etag.trim();
    }

    private static String resolveThumbExtension(String fileName, String contentType) {
        Optional<String> fromName = Optional.ofNullable(fileName)
            .map(String::trim)
            .filter(n -> !n.isEmpty())
            .filter(n -> THUMB_SAFE_EXT.matcher(n).find())
            .map(n -> {
                String lower = n.toLowerCase(Locale.ROOT);
                if (lower.endsWith(".png")) {
                    return ".png";
                }
                if (lower.endsWith(".webp")) {
                    return ".webp";
                }
                return ".jpg";
            });
        return fromName.orElse(THUMB_MIME_TO_EXT.get(contentType));
    }

    private static String normalizeContentType(String raw) {
        if (raw == null) {
            return "";
        }
        String trimmed = raw.trim().toLowerCase(Locale.ROOT);
        int semi = trimmed.indexOf(';');
        return semi >= 0 ? trimmed.substring(0, semi).trim() : trimmed;
    }

    private static String resolveExtension(String fileName, String contentType) {
        Optional<String> fromName = Optional.ofNullable(fileName)
            .map(String::trim)
            .filter(n -> !n.isEmpty())
            .filter(n -> SAFE_EXT.matcher(n).find())
            .map(n -> {
                String lower = n.toLowerCase(Locale.ROOT);
                if (lower.endsWith(".mp4")) {
                    return ".mp4";
                }
                if (lower.endsWith(".webm")) {
                    return ".webm";
                }
                return ".mov";
            });
        return fromName.orElse(MIME_TO_EXT.get(contentType));
    }

    private static long requireValidVideoFileSize(Long fileSizeBytes) {
        if (fileSizeBytes == null || fileSizeBytes <= 0L) {
            throw new BadRequestException("Missing video file size.");
        }
        if (fileSizeBytes > MAX_VIDEO_UPLOAD_BYTES) {
            throw new BadRequestException("Video exceeds the 30 GB limit.");
        }
        return fileSizeBytes;
    }

}
