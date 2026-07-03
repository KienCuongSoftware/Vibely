package com.vibely.backend.storage;

import com.vibely.backend.auth.service.UserAvatarResolver;
import com.vibely.backend.common.BadRequestException;
import org.springframework.stereotype.Component;

/**
 * Ensures media URLs point at objects under the caller's S3 prefix (uploads/ or thumbnails/).
 */
@Component
public class S3OwnedMediaValidator {

    private final S3Properties s3Properties;
    private final S3ObjectUrlBuilder objectUrlBuilder;

    public S3OwnedMediaValidator(S3Properties s3Properties, S3ObjectUrlBuilder objectUrlBuilder) {
        this.s3Properties = s3Properties;
        this.objectUrlBuilder = objectUrlBuilder;
    }

    /** Profile avatar: owned S3 thumbnail, local default path, or OAuth proxy for self. */
    public void requireAllowedAvatarUrl(String url, long userId) {
        if (url == null || url.isBlank()) {
            return;
        }
        String trimmed = url.trim();
        if (trimmed.startsWith("data:")) {
            throw new BadRequestException("Avatar phải được tải lên qua kho lưu trữ.");
        }
        if (trimmed.startsWith("/") && !trimmed.contains("://")) {
            if (trimmed.startsWith("/images/")) {
                return;
            }
            throw new BadRequestException("URL avatar không hợp lệ.");
        }
        if (UserAvatarResolver.oauthAvatarProxyPath(userId).equals(trimmed)) {
            return;
        }
        if (UserAvatarResolver.isOAuthCdnUrl(trimmed) || isGoogleAvatarUrl(trimmed)) {
            return;
        }
        if (!s3Properties.isEnabled()) {
            return;
        }
        requireOwnedThumbnail(trimmed, userId);
    }

    public void requireOwnedUpload(String url, long userId) {
        if (!s3Properties.isEnabled()) {
            return;
        }
        requireKeyPrefix(url, "uploads/" + userId + "/");
    }

    public void requireOwnedThumbnail(String url, long userId) {
        if (!s3Properties.isEnabled()) {
            return;
        }
        requireKeyPrefix(url, "thumbnails/" + userId + "/");
    }

    /** Extracted audio track under audios/{userId}/ (derived from upload path). */
    public void requireOwnedAudio(String url, long userId) {
        if (!s3Properties.isEnabled()) {
            return;
        }
        requireKeyPrefix(url, "audios/" + userId + "/");
    }

    /** Chat images (thumbnails/) and videos (uploads/) uploaded by the sender. */
    public void requireOwnedChatMedia(String url, long userId) {
        if (!s3Properties.isEnabled()) {
            return;
        }
        String key = resolveKey(url);
        String uploadPrefix = "uploads/" + userId + "/";
        String thumbPrefix = "thumbnails/" + userId + "/";
        if (!key.startsWith(uploadPrefix) && !key.startsWith(thumbPrefix)) {
            throw new BadRequestException("URL media chat không thuộc tài khoản của bạn.");
        }
    }

    private void requireKeyPrefix(String url, String requiredPrefix) {
        String key = resolveKey(url);
        if (!key.startsWith(requiredPrefix)) {
            throw new BadRequestException("URL media không thuộc tài khoản của bạn.");
        }
    }

    private String resolveKey(String url) {
        if (url == null || url.isBlank()) {
            throw new BadRequestException("URL media là bắt buộc.");
        }
        return objectUrlBuilder.resolveKeyFromUrl(url.trim())
            .orElseThrow(() -> new BadRequestException("URL media không hợp lệ hoặc không thuộc bucket ứng dụng."));
    }

    private static boolean isGoogleAvatarUrl(String url) {
        String lower = url.toLowerCase();
        return lower.contains("googleusercontent.com") || lower.contains("ggpht.com");
    }
}
