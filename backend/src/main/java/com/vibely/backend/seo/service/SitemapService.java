package com.vibely.backend.seo.service;

import com.vibely.backend.config.AppUrlProperties;
import com.vibely.backend.explore.Hashtag;
import com.vibely.backend.explore.HashtagRepository;
import com.vibely.backend.user.User;
import com.vibely.backend.user.UserRepository;
import com.vibely.backend.video.Video;
import com.vibely.backend.video.VideoRepository;
import com.vibely.backend.video.VideoStatus;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

@Service
public class SitemapService {

    private static final int MAX_SITEMAP_URLS = 50_000;
    private static final int STATIC_URL_COUNT = 3;

    private final AppUrlProperties appUrlProperties;
    private final UserRepository userRepository;
    private final VideoRepository videoRepository;
    private final HashtagRepository hashtagRepository;

    public SitemapService(
        AppUrlProperties appUrlProperties,
        UserRepository userRepository,
        VideoRepository videoRepository,
        HashtagRepository hashtagRepository
    ) {
        this.appUrlProperties = appUrlProperties;
        this.userRepository = userRepository;
        this.videoRepository = videoRepository;
        this.hashtagRepository = hashtagRepository;
    }

    public String robotsTxt() {
        return """
            User-agent: *
            Allow: /

            Sitemap: %s/sitemap.xml
            """.formatted(siteOrigin());
    }

    public String sitemapXml() {
        List<SitemapUrl> urls = new ArrayList<>();
        add(urls, "/", null, "daily", "1.0");
        add(urls, "/foryou", null, "daily", "0.9");
        add(urls, "/explore", null, "daily", "0.8");

        int remaining = MAX_SITEMAP_URLS - STATIC_URL_COUNT;
        int videoLimit = Math.max(0, remaining / 2);
        int userLimit = Math.max(0, remaining / 4);
        int hashtagLimit = Math.max(0, remaining - videoLimit - userLimit);

        for (User user : userRepository.findSitemapUsers(PageRequest.of(0, userLimit))) {
            add(urls, profilePath(user.getUsername()), user.getUpdatedAt(), "weekly", "0.7");
        }
        for (Video video : videoRepository.findSitemapVideos(VideoStatus.READY, PageRequest.of(0, videoLimit))) {
            add(urls, videoPath(video), video.getCreatedAt(), "weekly", "0.8");
        }
        for (Hashtag hashtag : hashtagRepository.findSitemapHashtags(PageRequest.of(0, hashtagLimit))) {
            add(urls, hashtagPath(hashtag.getTag()), null, "weekly", "0.6");
        }

        StringBuilder xml = new StringBuilder();
        xml.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        xml.append("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n");
        for (SitemapUrl url : urls) {
            xml.append("  <url>\n");
            xml.append("    <loc>").append(escapeXml(url.loc())).append("</loc>\n");
            if (url.lastmod() != null) {
                xml.append("    <lastmod>").append(url.lastmod()).append("</lastmod>\n");
            }
            xml.append("    <changefreq>").append(url.changefreq()).append("</changefreq>\n");
            xml.append("    <priority>").append(url.priority()).append("</priority>\n");
            xml.append("  </url>\n");
        }
        xml.append("</urlset>\n");
        return xml.toString();
    }

    private void add(
        List<SitemapUrl> urls,
        String path,
        LocalDateTime lastmod,
        String changefreq,
        String priority
    ) {
        if (path == null || path.isBlank()) {
            return;
        }
        String normalizedPath = path.startsWith("/") ? path : "/" + path;
        LocalDate lastmodDate = lastmod == null ? null : lastmod.toLocalDate();
        urls.add(new SitemapUrl(siteOrigin() + normalizedPath, lastmodDate, changefreq, priority));
    }

    private String profilePath(String username) {
        String handle = cleanHandle(username);
        return handle.isBlank() ? "" : "/@" + encodePathSegment(handle);
    }

    private String videoPath(Video video) {
        String handle = cleanHandle(video.getAuthor() == null ? "" : video.getAuthor().getUsername());
        if (video.getPublicId() == null) {
            return "";
        }
        if (handle.isBlank()) {
            return "/watch/" + video.getPublicId();
        }
        return "/@" + encodePathSegment(handle) + "/video/" + video.getPublicId();
    }

    private String hashtagPath(String tag) {
        String normalized = String.valueOf(tag == null ? "" : tag).trim().replaceFirst("^#+", "");
        return normalized.isBlank() ? "" : "/tag/" + encodePathSegment(normalized);
    }

    private String siteOrigin() {
        String origin = appUrlProperties.normalizedFrontendBaseUrl();
        return origin.isBlank() ? "https://vibely.sbs" : origin;
    }

    private static String cleanHandle(String raw) {
        return String.valueOf(raw == null ? "" : raw).trim().replaceFirst("^@+", "");
    }

    private static String encodePathSegment(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8).replace("+", "%20");
    }

    private static String escapeXml(String raw) {
        return String.valueOf(raw == null ? "" : raw)
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;")
            .replace("'", "&apos;");
    }

    private record SitemapUrl(String loc, LocalDate lastmod, String changefreq, String priority) {}
}
