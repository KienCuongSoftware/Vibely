package com.vibely.backend.moderation;

import java.util.Locale;
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

    private BanReasonFormatter() {
    }

    public static String forCaptionViolation(String title, String description) {
        String caption = cleanCaption(title, description);
        String kind = looksViolent(caption)
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
        return trimmed;
    }

    private static boolean looksViolent(String caption) {
        return StringUtils.hasText(caption) && VIOLENCE_CUE.matcher(caption).find();
    }

    private static boolean looksLikeRegexLeak(String text) {
        return text.contains("\\b")
            || text.contains("\\s")
            || text.contains("(?:")
            || text.contains("nudes?\\b")
            || text.contains("caption spam/tình dục):");
    }

    private static String cleanCaption(String title, String description) {
        String caption = ((title == null ? "" : title) + " " + (description == null ? "" : description))
            .trim()
            .replaceAll("\\s+", " ");
        if (caption.length() > 80) {
            return caption.substring(0, 77) + "...";
        }
        return caption;
    }
}
