package com.vibely.backend.share;

import java.util.Locale;

final class SharePreviewHtmlRenderer {

    private SharePreviewHtmlRenderer() {}

    static String render(SharePreviewModel model) {
        String title = escape(model.documentTitle());
        String headline = escape(model.headline());
        String description = escape(model.description());
        String pageUrl = escape(model.pageUrl());
        String imageUrl = escape(model.imageUrl());
        String redirectUrl = escape(model.redirectUrl());
        String siteName = escape(model.siteName());
        String jsonLd = jsonVideoObject(model);

        return """
            <!DOCTYPE html>
            <html lang="vi">
            <head>
              <meta charset="utf-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1" />
              <title>%s</title>
              <meta name="description" content="%s" />
              <meta property="og:type" content="video.other" />
              <meta property="og:site_name" content="%s" />
              <meta property="og:title" content="%s" />
              <meta property="og:description" content="%s" />
              <meta property="og:url" content="%s" />
              <meta property="og:image" content="%s" />
              <meta property="og:image:secure_url" content="%s" />
              <meta name="twitter:card" content="summary_large_image" />
              <meta name="twitter:title" content="%s" />
              <meta name="twitter:description" content="%s" />
              <meta name="twitter:image" content="%s" />
              <meta name="twitter:url" content="%s" />
              <link rel="canonical" href="%s" />
              <script type="application/ld+json">%s</script>
            </head>
            <body>
              <p>%s</p>
              <p><a href="%s">Xem trên Vibely</a></p>
              <script>window.location.replace("%s");</script>
            </body>
            </html>
            """.formatted(
            title,
            description,
            siteName,
            headline,
            description,
            pageUrl,
            imageUrl,
            imageUrl,
            headline,
            description,
            imageUrl,
            redirectUrl,
            redirectUrl,
            jsonLd,
            headline,
            redirectUrl,
            redirectUrl
        );
    }

    private static String escape(String raw) {
        if (raw == null || raw.isBlank()) {
            return "";
        }
        return raw
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;")
            .replace("'", "&#39;");
    }

    private static String jsonVideoObject(SharePreviewModel model) {
        return """
            {"@context":"https://schema.org","@type":"VideoObject","name":"%s","description":"%s","thumbnailUrl":["%s"],"url":"%s","embedUrl":"%s","publisher":{"@type":"Organization","name":"%s","url":"%s"}}
            """.formatted(
            jsonEscape(model.headline()),
            jsonEscape(model.description()),
            jsonEscape(model.imageUrl()),
            jsonEscape(model.redirectUrl()),
            jsonEscape(model.redirectUrl()),
            jsonEscape(model.siteName()),
            jsonEscape(model.redirectUrl())
        ).trim();
    }

    private static String jsonEscape(String raw) {
        if (raw == null) {
            return "";
        }
        return raw
            .replace("\\", "\\\\")
            .replace("\"", "\\\"")
            .replace("\b", "\\b")
            .replace("\f", "\\f")
            .replace("\n", "\\n")
            .replace("\r", "\\r")
            .replace("\t", "\\t")
            .replace("<", "\\u003c")
            .replace(">", "\\u003e")
            .replace("&", "\\u0026");
    }

    static String truncateDescription(String raw, int maxLen) {
        if (raw == null || raw.isBlank()) {
            return "";
        }
        String normalized = raw.replaceAll("\\s+", " ").trim();
        if (normalized.length() <= maxLen) {
            return normalized;
        }
        return normalized.substring(0, Math.max(0, maxLen - 1)).trim() + "…";
    }

    static String buildPageTitle(String videoTitle, String authorLabel) {
        String title = videoTitle == null || videoTitle.isBlank() ? "Video trên Vibely" : videoTitle.trim();
        if (authorLabel == null || authorLabel.isBlank()) {
            return title + " | Vibely";
        }
        return title + " (@%s) | Vibely".formatted(authorLabel.trim());
    }

    /** Tiêu đề OG — cùng logic caption trên trang watch. */
    static ShareText resolveShareText(String title, String description, String authorLabel) {
        String author = authorLabel == null || authorLabel.isBlank() ? "vibely" : authorLabel.trim();
        String caption = pickShareCaption(title, description, author);
        String headline = truncateDescription(caption, 120);
        String metaDescription = truncateDescription(caption, DESCRIPTION_CAP);
        if (metaDescription.isBlank()) {
            metaDescription = "@" + author + " · Vibely";
        }
        String documentTitle = headline + " | Vibely";
        return new ShareText(documentTitle, headline, metaDescription);
    }

    /** Giống watchPageCaption trên frontend. */
    static String pickShareCaption(String title, String description, String author) {
        String ttl = title == null ? "" : title.trim();
        String desc = description == null ? "" : description.trim();
        if (!isJunkCaption(ttl)) {
            return ttl;
        }
        if (!isJunkCaption(desc)) {
            return desc;
        }
        return "Video trên Vibely · @" + author;
    }

    static boolean isJunkCaption(String raw) {
        if (raw == null || raw.isBlank()) {
            return true;
        }
        String s = raw.trim();
        if (s.matches("(?i)https?://.*")) {
            return true;
        }
        if (s.matches("(?i).*\\.(mp4|webm|mov)(\\?.*)?$")) {
            return true;
        }
        String lower = s.toLowerCase(Locale.ROOT);
        if (lower.contains("snaptik")
            || lower.contains("snaplik")
            || lower.contains("ssstik")
            || lower.contains("tikmate")
            || lower.contains("savetik")
            || lower.contains("tiktokcdn")
            || lower.contains("instagram")
            || lower.contains("fbcdn")
            || lower.contains("facebook.com/")) {
            return true;
        }
        if (s.matches("(?i)[a-z0-9][a-z0-9.-]*\\.[a-z]{2,}[_-]\\d{8,}")) {
            return true;
        }
        return false;
    }

    private static final int DESCRIPTION_CAP = 300;

    record ShareText(String documentTitle, String headline, String metaDescription) {}

    static String normalizeAbsoluteUrl(String raw, String fallbackOrigin) {
        if (raw == null || raw.isBlank()) {
            return "";
        }
        String trimmed = raw.trim();
        if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
            return trimmed;
        }
        String origin = fallbackOrigin == null ? "" : fallbackOrigin.replaceAll("/$", "");
        if (origin.isBlank()) {
            return trimmed.startsWith("/") ? trimmed : "/" + trimmed;
        }
        return origin + (trimmed.startsWith("/") ? trimmed : "/" + trimmed);
    }

    static String encodePathSegment(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        return java.net.URLEncoder.encode(value.trim(), java.nio.charset.StandardCharsets.UTF_8)
            .replace("+", "%20");
    }

    static String authorHandle(String username, String displayName) {
        if (username != null && !username.isBlank()) {
            return username.trim().replaceFirst("^@+", "");
        }
        if (displayName != null && !displayName.isBlank()) {
            return displayName.trim();
        }
        return "vibely";
    }

    static String requestOrigin(jakarta.servlet.http.HttpServletRequest request) {
        String forwardedProto = header(request, "X-Forwarded-Proto");
        String proto = forwardedProto != null ? forwardedProto : request.getScheme();
        String host = header(request, "X-Forwarded-Host");
        if (host == null) {
            host = header(request, "Host");
        }
        if (host == null || host.isBlank()) {
            return "";
        }
        String scheme = proto == null ? "http" : proto.toLowerCase(Locale.ROOT);
        String hostLower = host.toLowerCase(Locale.ROOT);
        if (hostLower.contains("ngrok") && "http".equals(scheme)) {
            scheme = "https";
        }
        if (hostLower.contains("trycloudflare.com") && "http".equals(scheme)) {
            scheme = "https";
        }
        return scheme + "://" + host.split(",")[0].trim();
    }

    private static String header(jakarta.servlet.http.HttpServletRequest request, String name) {
        String value = request.getHeader(name);
        return value == null || value.isBlank() ? null : value.trim();
    }
}
