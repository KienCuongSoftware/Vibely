package com.vibely.backend.storage;

import com.vibely.backend.common.BadRequestException;
import com.vibely.backend.common.NotFoundException;
import com.vibely.backend.user.UserRepository;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

@Service
@ConditionalOnProperty(prefix = "app.s3", name = "enabled", havingValue = "true")
public class S3PresignedUploadService {

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
    private final S3Properties properties;
    private final S3ObjectUrlBuilder objectUrlBuilder;
    private final UserRepository userRepository;

    public S3PresignedUploadService(
        S3Presigner presigner,
        S3Properties properties,
        S3ObjectUrlBuilder objectUrlBuilder,
        UserRepository userRepository
    ) {
        this.presigner = presigner;
        this.properties = properties;
        this.objectUrlBuilder = objectUrlBuilder;
        this.userRepository = userRepository;
    }

    public PresignedUploadResponse presign(String userEmail, VideoPresignRequest request) {
        if (properties.getBucket() == null || properties.getBucket().isBlank()) {
            throw new BadRequestException("Chưa cấu hình AWS_S3_BUCKET.");
        }
        String contentType = normalizeContentType(request.getContentType());
        if (!ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new BadRequestException("Chỉ chấp nhận video MP4, WebM hoặc MOV.");
        }
        String extension = resolveExtension(request.getFileName(), contentType);
        long authorId = userRepository.findByEmail(userEmail)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng"))
            .getId();
        String key = "uploads/" + authorId + "/" + UUID.randomUUID() + extension;

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

    /**
     * Presign PUT cho ảnh bìa (JPG, PNG, WebP), key dưới thư mục thumbnails/.
     */
    public PresignedUploadResponse presignThumbnail(String userEmail, VideoPresignRequest request) {
        if (properties.getBucket() == null || properties.getBucket().isBlank()) {
            throw new BadRequestException("Chưa cấu hình AWS_S3_BUCKET.");
        }
        String contentType = normalizeContentType(request.getContentType());
        if ("image/jpg".equals(contentType)) {
            contentType = "image/jpeg";
        }
        if (!THUMB_CONTENT_TYPES.contains(contentType)) {
            throw new BadRequestException("Chỉ chấp nhận ảnh JPG, PNG hoặc WebP.");
        }
        String extension = resolveThumbExtension(request.getFileName(), contentType);
        long authorId = userRepository.findByEmail(userEmail)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng"))
            .getId();
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

}
