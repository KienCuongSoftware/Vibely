package com.vibely.backend.storage;

import com.vibely.backend.common.BadRequestException;
import com.vibely.backend.common.NotFoundException;
import com.vibely.backend.user.UserRepository;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
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
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
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

    private final S3Presigner presigner;
    private final S3Properties properties;
    private final UserRepository userRepository;

    public S3PresignedUploadService(S3Presigner presigner, S3Properties properties, UserRepository userRepository) {
        this.presigner = presigner;
        this.properties = properties;
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
        String playbackUrl = buildPlaybackUrl(key);

        return new PresignedUploadResponse(
            presigned.url().toString(),
            "PUT",
            contentType,
            key,
            playbackUrl,
            expiresAt.toEpochMilli()
        );
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

    private String buildPlaybackUrl(String key) {
        String base = properties.getPublicUrlBase();
        if (base != null && !base.isBlank()) {
            String normalized = base.endsWith("/") ? base.substring(0, base.length() - 1) : base;
            return normalized + "/" + encodeKeyForUrl(key);
        }
        String bucket = properties.getBucket();
        String region = properties.getRegion();
        return "https://" + bucket + ".s3." + region + ".amazonaws.com/" + encodeKeyForUrl(key);
    }

    private static String encodeKeyForUrl(String key) {
        String[] parts = key.split("/");
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < parts.length; i++) {
            if (i > 0) {
                sb.append('/');
            }
            sb.append(URLEncoder.encode(parts[i], StandardCharsets.UTF_8).replace("+", "%20"));
        }
        return sb.toString();
    }
}
