package com.vibely.backend.share;

import com.vibely.backend.config.AppUrlProperties;
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
    private final AppUrlProperties appUrlProperties;

    public SharePreviewService(VideoService videoService, AppUrlProperties appUrlProperties) {
        this.videoService = videoService;
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
