package com.vibely.backend.moderation;

import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.util.StringUtils;

/**
 * User/admin-facing ban reasons — never expose raw regex or engine tokens.
 */
public final class BanReasonFormatter {

    private static final Pattern VIOLENCE_CUE = Pattern.compile(
        "giết|giet|ám\\s*sát|am\\s*sat|thảm\\s*sát|khủng\\s*bố|khung\\s*bo|"
            + "đặt\\s*bom|chém|đâm\\s*chết|bắn\\s*chết|\\bkill\\b|massacre|gore|behead",
        Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
    );

    /**
     * Auto titles from downloaders / raw filenames (snaptik, tiktok ids, *.mp4, …).
     * These must not appear in user-facing ban captions.
     */
    private static final Pattern FILE_LIKE_TITLE = Pattern.compile(
        "(?i)^(?:"
            + "snaptik(?:\\.vn)?[_-]\\d+"
            + "|tiktok[_-]?\\d+"
            + "|\\d{10,}"
            + "|.*\\.(?:mp4|webm|mov|mkv|m4v|avi)"
            + ")$"
    );

    private static final Pattern FILE_LIKE_TOKEN = Pattern.compile(
        "(?i)\\b(?:snaptik(?:\\.vn)?[_-]\\d+|tiktok[_-]?\\d+)\\b"
    );

    private static final Pattern CAPTION_QUOTE = Pattern.compile(
        "trong caption:\\s*\"([^\"]*)\"",
        Pattern.CASE_INSENSITIVE
    );

    private BanReasonFormatter() {
    }

    public static String forCaptionViolation(String title, String description) {
        String caption = cleanCaption(title, description);
        String kind = looksViolent(title, description, caption)
            ? "nội dung bạo lực"
            : "ngôn từ tục tĩu / nội dung tình dục";
        if (StringUtils.hasText(caption)) {
            return kind + " trong caption: \"" + caption + "\"";
        }
        return kind + " trong caption hoặc mô tả video";
    }

    /** Soften historical rows that stored regex patterns as ban_reason. */
    public static String forDisplay(String raw) {
        if (!StringUtils.hasText(raw)) {
            return "Vi phạm chính sách cộng đồng";
        }
        String trimmed = raw.trim();
        if (looksLikeRegexLeak(trimmed)) {
            return "vi phạm chính sách cộng đồng trong caption hoặc mô tả video";
        }
        String lower = trimmed.toLowerCase(Locale.ROOT);
        if (lower.startsWith("vi phạm chính sách nội dung (caption")
            || lower.contains("caption spam")) {
            return "vi phạm chính sách cộng đồng trong caption hoặc mô tả video";
        }
        Matcher quote = CAPTION_QUOTE.matcher(trimmed);
        if (quote.find()) {
            String cleaned = stripFileNoise(quote.group(1));
            if (StringUtils.hasText(cleaned) && !cleaned.equals(quote.group(1).trim())) {
                return trimmed.substring(0, quote.start(1)) + cleaned + trimmed.substring(quote.end(1));
            }
            if (!StringUtils.hasText(cleaned)) {
                return trimmed.replaceFirst("(?i)\\s*trong caption:\\s*\"[^\"]*\"", "").trim();
            }
        }
        return stripFileNoise(trimmed);
    }

    private static boolean looksViolent(String title, String description, String caption) {
        String blob = ((title == null ? "" : title) + "\n" + (description == null ? "" : description)
            + "\n" + (caption == null ? "" : caption)).trim();
        return StringUtils.hasText(blob) && VIOLENCE_CUE.matcher(blob).find();
    }

    private static boolean looksLikeRegexLeak(String text) {
        return text.contains("\\b")
            || text.contains("\\s")
            || text.contains("(?:")
            || text.contains("nudes?\\b")
            || text.contains("caption spam/tình dục):");
    }

    /**
     * Prefer the user-written description; omit auto filename titles.
     */
    private static String cleanCaption(String title, String description) {
        String desc = normalizeSpace(description);
        String ttl = normalizeSpace(title);

        if (StringUtils.hasText(desc)) {
            // Description already contains the title (common after draft seed with filename).
            if (StringUtils.hasText(ttl) && !isFileLikeTitle(ttl) && !containsIgnoreCase(desc, ttl)) {
                return truncate(ttl + " " + desc);
            }
            return truncate(stripFileNoise(desc));
        }
        if (StringUtils.hasText(ttl) && !isFileLikeTitle(ttl)) {
            return truncate(ttl);
        }
        return "";
    }

    private static String stripFileNoise(String text) {
        if (!StringUtils.hasText(text)) {
            return "";
        }
        String out = FILE_LIKE_TOKEN.matcher(text).replaceAll(" ");
        out = normalizeSpace(out);
        if (isFileLikeTitle(out)) {
            return "";
        }
        return out;
    }

    private static boolean isFileLikeTitle(String text) {
        if (!StringUtils.hasText(text)) {
            return false;
        }
        String t = text.trim();
        if (FILE_LIKE_TITLE.matcher(t).matches()) {
            return true;
        }
        // snaptik.vn_123… (with optional extra suffix after id)
        return t.toLowerCase(Locale.ROOT).startsWith("snaptik")
            && t.chars().filter(Character::isDigit).count() >= 10;
    }

    private static boolean containsIgnoreCase(String haystack, String needle) {
        return haystack.toLowerCase(Locale.ROOT).contains(needle.toLowerCase(Locale.ROOT));
    }

    private static String normalizeSpace(String raw) {
        if (raw == null) {
            return "";
        }
        return raw.trim().replaceAll("\\s+", " ");
    }

    private static String truncate(String caption) {
        if (caption.length() > 80) {
            return caption.substring(0, 77) + "...";
        }
        return caption;
    }
}
