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
     * Auto titles from downloaders / raw filenames (snaptik, tiktok ids, *.mp4,
     * underscore stems like {@code Video_Tinh_Duc}, …).
     * These must not appear in user-facing ban captions.
     */
    private static final Pattern FILE_LIKE_TITLE = Pattern.compile(
        "(?i)^(?:"
            + "snaptik(?:\\.vn)?[_-]\\d+"
            + "|tiktok[_-]?\\d+"
            + "|\\d{10,}"
            + "|.*\\.(?:mp4|webm|mov|mkv|m4v|avi)"
            // Underscore / dash stems without spaces: Video_Tinh_Duc, my-clip-01
            + "|[\\p{L}\\p{N}]+(?:[_-][\\p{L}\\p{N}]+){1,}"
            + ")$"
    );

    private static final Pattern FILE_LIKE_TOKEN = Pattern.compile(
        "(?i)\\b(?:snaptik(?:\\.vn)?[_-]\\d+|tiktok[_-]?\\d+|[\\p{L}\\p{N}]+(?:[_-][\\p{L}\\p{N}]+){1,})\\b"
    );

    private static final Pattern CAPTION_QUOTE = Pattern.compile(
        "trong caption:\\s*\"([^\"]*)\"",
        Pattern.CASE_INSENSITIVE
    );

    /** Harmless filler often left after stripping a sexual filename from the ban quote. */
    private static final Pattern FILLER_CAPTION = Pattern.compile(
        "(?i)^(he|ha|hí+|hi+|kk+|lol+|haha|hehe|heh)+[heha]*$"
    );

    private BanReasonFormatter() {
    }

    public static String forCaptionViolation(String description) {
        return forCaptionViolation(null, description);
    }

    public static String forCaptionViolation(String title, String description) {
        String desc = normalizeSpace(description);
        String kind = looksViolent(null, description, desc)
            ? "nội dung bạo lực"
            : "ngôn từ tục tĩu / nội dung tình dục";

        String caption = cleanCaption(null, description);
        if (StringUtils.hasText(caption) && !looksLikeFillerCaption(caption)) {
            return kind + " trong caption: \"" + caption + "\"";
        }
        return kind + " trong caption video";
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
            String quoted = quote.group(1).trim();
            String cleaned = stripFileNoise(quoted);
            // Old bans wrongly blamed filler captions after a filename title hit.
            if (looksLikeFillerCaption(cleaned) || looksLikeFillerCaption(quoted)) {
                return "vi phạm chính sách cộng đồng (đã cập nhật: chỉ xét caption + nội dung video)";
            }
            if (StringUtils.hasText(cleaned) && !cleaned.equals(quoted)) {
                return trimmed.substring(0, quote.start(1)) + cleaned + trimmed.substring(quote.end(1));
            }
            if (!StringUtils.hasText(cleaned)) {
                String without = trimmed.replaceFirst("(?i)\\s*trong caption:\\s*\"[^\"]*\"", "").trim();
                if (without.toLowerCase(Locale.ROOT).contains("tình dục")
                    || without.toLowerCase(Locale.ROOT).contains("bạo lực")) {
                    return without.endsWith("vì") || without.endsWith("vì ")
                        ? without
                        : (StringUtils.hasText(without)
                            ? without
                            : "ngôn từ tục tĩu / nội dung tình dục trong tiêu đề video (tên tệp tải lên)");
                }
                return StringUtils.hasText(without)
                    ? without
                    : "vi phạm chính sách cộng đồng trong tiêu đề video (tên tệp tải lên)";
            }
        }
        return stripFileNoise(trimmed);
    }

    static boolean looksLikeFillerCaption(String text) {
        if (!StringUtils.hasText(text)) {
            return true;
        }
        String compact = text.replaceAll("\\s+", "");
        return FILLER_CAPTION.matcher(compact).matches();
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
            desc = stripFileNoise(desc);
            if (!StringUtils.hasText(desc)) {
                return "";
            }
            // Never prepend file-like / downloader titles onto the real caption.
            if (StringUtils.hasText(ttl)
                && !isFileLikeTitle(ttl)
                && !containsIgnoreCase(desc, ttl)) {
                return truncate(ttl + " " + desc);
            }
            return truncate(desc);
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

    static boolean isFileLikeTitle(String text) {
        if (!StringUtils.hasText(text)) {
            return false;
        }
        String t = text.trim();
        if (FILE_LIKE_TITLE.matcher(t).matches()) {
            return true;
        }
        // snaptik.vn_123… (with optional extra suffix after id)
        if (t.toLowerCase(Locale.ROOT).startsWith("snaptik")
            && t.chars().filter(Character::isDigit).count() >= 10) {
            return true;
        }
        // Spaces but still a download stem: "Video_Tinh_Duc copy"
        String first = t.split("\\s+")[0];
        return first.length() >= 3 && FILE_LIKE_TITLE.matcher(first).matches();
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
