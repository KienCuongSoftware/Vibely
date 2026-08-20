package com.vibely.backend.share;

import com.vibely.backend.auth.service.UserAvatarResolver;
import com.vibely.backend.config.AppUrlProperties;
import com.vibely.backend.user.dto.PublicUserProfileResponse;
import com.vibely.backend.user.service.UserService;
import com.vibely.backend.video.VideoPublicIds;
import com.vibely.backend.video.VideoResponse;
import com.vibely.backend.video.service.VideoService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Locale;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class SharePreviewService {

    private static final String SITE_NAME = "Vibely";

    private final VideoService videoService;
    private final UserService userService;
    private final AppUrlProperties appUrlProperties;

    public SharePreviewService(
        VideoService videoService,
        UserService userService,
        AppUrlProperties appUrlProperties
    ) {
        this.videoService = videoService;
        this.userService = userService;
        this.appUrlProperties = appUrlProperties;
    }

    public SharePreviewModel buildModel(UUID publicId, HttpServletRequest request) {
        VideoResponse video = videoService.getVideoByPublicIdForViewer(publicId, null);
        String origin = SharePreviewOriginResolver.resolve(
            appUrlProperties.normalizedFrontendBaseUrl(),
            request
        );
        String sharePath = "/share/video/" + publicId;
        String pageUrl = origin + sharePath;
        String redirectUrl = buildWatchUrl(origin, video);
        String author = SharePreviewHtmlRenderer.authorHandle(
            video.authorUsername(),
            video.authorDisplayName()
        );
        SharePreviewHtmlRenderer.ShareText shareText = SharePreviewHtmlRenderer.resolveShareText(
            video.title(),
            video.description(),
            author
        );
        String imageUrl = SharePreviewHtmlRenderer.normalizeAbsoluteUrl(
            firstNonBlank(video.thumbnailUrl(), video.authorAvatarUrl()),
            origin
        );
        if (imageUrl.isBlank()) {
            imageUrl = origin + "/favicon-512x512.png";
        }
        return new SharePreviewModel(
            shareText.documentTitle(),
            shareText.headline(),
            shareText.metaDescription(),
            pageUrl,
            redirectUrl,
            imageUrl,
            SITE_NAME
        );
    }

    public SharePreviewModel buildProfileModel(String rawUsername, HttpServletRequest request) {
        PublicUserProfileResponse profile = userService.getPublicProfile(rawUsername, null);
        String origin = SharePreviewOriginResolver.resolve(
            appUrlProperties.normalizedFrontendBaseUrl(),
            request
        );
        String handle = SharePreviewHtmlRenderer.authorHandle(profile.username(), profile.displayName());
        String sharePath = "/share/profile/" + SharePreviewHtmlRenderer.encodePathSegment(handle);
        String pageUrl = origin + sharePath;
        String redirectUrl = origin + "/@" + SharePreviewHtmlRenderer.encodePathSegment(handle);

        String displayName = profile.displayName() == null ? "" : profile.displayName().trim();
        String headline = displayName.isBlank() || displayName.equalsIgnoreCase(handle)
            ? "@" + handle + " on Vibely"
            : displayName + " (@" + handle + ") on Vibely";
        String bio = profile.bio() == null ? "" : profile.bio().trim();
        String description = SharePreviewHtmlRenderer.truncateDescription(
            bio.isBlank()
                ? "View profile @" + handle + " on Vibely — Make Your Day."
                : bio,
            300
        );
        String documentTitle = headline + " | Vibely";

        // Ưu tiên avatar trên domain Vibely (proxy OAuth) — Facebook đọc ổn hơn CDN Google s96.
        String rawAvatar = profile.avatarUrl() == null ? "" : profile.avatarUrl().trim();
        String imageUrl;
        if (rawAvatar.startsWith("/api/users/oauth-avatar/")) {
            imageUrl = SharePreviewHtmlRenderer.normalizeAbsoluteUrl(rawAvatar, origin);
        } else if (UserAvatarResolver.isOAuthCdnUrl(rawAvatar)) {
            imageUrl = origin + UserAvatarResolver.oauthAvatarProxyPath(profile.id());
        } else {
            imageUrl = SharePreviewHtmlRenderer.normalizeAbsoluteUrl(
                UserAvatarResolver.enlargeOAuthAvatarUrl(rawAvatar),
                origin
            );
        }
        if (imageUrl.isBlank() || imageUrl.endsWith(UserAvatarResolver.DEFAULT_AVATAR_URL)) {
            // Vẫn tuyệt đối hóa default avatar trên Vibely
            imageUrl = SharePreviewHtmlRenderer.normalizeAbsoluteUrl(
                UserAvatarResolver.DEFAULT_AVATAR_URL,
                origin
            );
        }
        // Fallback cuối: favicon lớn
        if (imageUrl.isBlank()) {
            imageUrl = origin + "/favicon-512x512.png";
        }

        return new SharePreviewModel(
            documentTitle,
            SharePreviewHtmlRenderer.truncateDescription(headline, 120),
            description,
            pageUrl,
            redirectUrl,
            imageUrl,
            SITE_NAME
        );
    }

    public boolean isSocialCrawler(String userAgent) {
        if (userAgent == null || userAgent.isBlank()) {
            return false;
        }
        String ua = userAgent.toLowerCase(Locale.ROOT);
        return ua.contains("facebookexternalhit")
            || ua.contains("facebot")
            || ua.contains("twitterbot")
            || ua.contains("linkedinbot")
            || ua.contains("whatsapp")
            || ua.contains("telegrambot")
            || ua.contains("slackbot")
            || ua.contains("discordbot")
            || ua.contains("pinterest")
            || ua.contains("googlebot")
            || ShareClientHints.fromUserAgent(userAgent).bot();
    }

    private String buildWatchUrl(String origin, VideoResponse video) {
        String handle = SharePreviewHtmlRenderer.authorHandle(
            video.authorUsername(),
            video.authorDisplayName()
        );
        UUID publicId = video.publicId();
        if (handle != null && !handle.isBlank() && publicId != null) {
            return origin
                + "/@"
                + SharePreviewHtmlRenderer.encodePathSegment(handle)
                + "/video/"
                + publicId;
        }
        return origin + "/watch/" + publicId;
    }

    private static String firstNonBlank(String... values) {
        if (values == null) {
            return "";
        }
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return "";
    }

    public static UUID parsePublicId(String raw) {
        return VideoPublicIds.parse(raw);
    }
}
