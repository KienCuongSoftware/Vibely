package com.vibely.backend.video;

import java.net.URI;
import java.util.Locale;
import java.util.Set;

/** Chuẩn hoá nguồn traffic client gửi khi ghi lượt xem. */
public final class VideoViewTraffic {

    public static final String FOR_YOU = "foryou";
    public static final String PROFILE = "profile";
    public static final String SEARCH = "search";
    public static final String OTHER = "other";
    /** Phát trong Studio Analytics — không tính vào mix For You / Profile / Search / Other. */
    public static final String STUDIO = "studio";

    public static final int SEARCH_QUERY_MAX = 80;

    private static final Set<String> ALLOWED = Set.of(FOR_YOU, PROFILE, SEARCH, OTHER, STUDIO);

    private VideoViewTraffic() {}

    public static String normalizeSource(String raw) {
        if (raw == null) {
            return OTHER;
        }
        String source = raw.trim().toLowerCase(Locale.ROOT);
        return ALLOWED.contains(source) ? source : OTHER;
    }

    /**
     * Nếu client không gửi source (SPA cũ), suy từ Referer cùng origin.
     * Trang /@user/video/{id} là watch kiểu For You, không phải “Other”.
     */
    public static VideoViewRequest applySource(VideoViewRequest body, String referer) {
        if (body == null) {
            return null;
        }
        String raw = body.source();
        String source = (raw == null || raw.isBlank())
            ? inferSourceFromReferer(referer)
            : normalizeSource(raw);
        String query = normalizeSearchQuery(source, body.searchQuery());
        if (SEARCH.equals(source) && query == null) {
            query = queryFromReferer(referer);
        }
        return new VideoViewRequest(body.watchedMs(), body.durationMs(), source, query);
    }

    public static String inferSourceFromReferer(String referer) {
        String path = pathOf(referer);
        if (path == null) {
            return OTHER;
        }
        if (path.isEmpty() || "/".equals(path) || path.startsWith("/foryou") || path.startsWith("/feed")) {
            return FOR_YOU;
        }
        if (path.startsWith("/search") || path.startsWith("/tag/")) {
            return SEARCH;
        }
        if (path.startsWith("/explore")
            || path.startsWith("/following")
            || path.startsWith("/friends")
            || path.startsWith("/vibelystudio")
            || path.startsWith("/live")) {
            return OTHER;
        }
        if (path.matches("^/@[^/]+/video(/.*)?$")) {
            return FOR_YOU;
        }
        if (path.matches("^/@[^/]+/[^/]+/?$")) {
            return PROFILE;
        }
        return OTHER;
    }

    public static String normalizeSearchQuery(String source, String raw) {
        if (!SEARCH.equals(source) || raw == null) {
            return null;
        }
        StringBuilder out = new StringBuilder(raw.length());
        boolean pendingSpace = false;
        for (int i = 0; i < raw.length(); i++) {
            char c = raw.charAt(i);
            if (c <= 31 || c == 127) {
                pendingSpace = out.length() > 0;
                continue;
            }
            if (Character.isWhitespace(c)) {
                pendingSpace = out.length() > 0;
                continue;
            }
            if (pendingSpace) {
                out.append(' ');
                pendingSpace = false;
            }
            out.append(c);
            if (out.length() >= SEARCH_QUERY_MAX) {
                break;
            }
        }
        return out.isEmpty() ? null : out.toString();
    }

    private static String queryFromReferer(String referer) {
        String query = queryOf(referer);
        if (query == null) {
            return null;
        }
        for (String part : query.split("&")) {
            int eq = part.indexOf('=');
            String key = eq < 0 ? part : part.substring(0, eq);
            if (!"q".equalsIgnoreCase(key) || eq < 0) {
                continue;
            }
            try {
                return normalizeSearchQuery(
                    SEARCH,
                    java.net.URLDecoder.decode(part.substring(eq + 1), java.nio.charset.StandardCharsets.UTF_8)
                );
            } catch (RuntimeException ignored) {
                return normalizeSearchQuery(SEARCH, part.substring(eq + 1));
            }
        }
        return null;
    }

    private static String pathOf(String referer) {
        if (referer == null || referer.isBlank()) {
            return null;
        }
        try {
            URI uri = URI.create(referer.trim());
            String path = uri.getPath();
            if (path == null || path.isBlank()) {
                return "/";
            }
            return path.toLowerCase(Locale.ROOT);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private static String queryOf(String referer) {
        if (referer == null || referer.isBlank()) {
            return null;
        }
        try {
            return URI.create(referer.trim()).getRawQuery();
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
