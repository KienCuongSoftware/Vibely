package com.vibely.backend.moderation;

import org.springframework.util.StringUtils;

/**
 * User/admin-facing ban reasons — never expose raw regex or engine tokens.
 */
public final class BanReasonFormatter {

    private BanReasonFormatter() {
    }

    public static String forCaptionViolation(String title, String description) {
        String caption = cleanCaption(title, description);
        if (StringUtils.hasText(caption)) {
            return "Spam / nội dung tình dục trong caption: \"" + caption + "\"";
        }
        return "Spam / nội dung tình dục trong caption hoặc mô tả video";
    }

    /** Soften historical rows that stored regex patterns as ban_reason. */
    public static String forDisplay(String raw) {
        if (!StringUtils.hasText(raw)) {
            return "Vi phạm chính sách cộng đồng";
        }
        String trimmed = raw.trim();
        if (looksLikeRegexLeak(trimmed)) {
            return "Spam / nội dung tình dục trong caption hoặc mô tả video";
        }
        // Drop leading "Vi phạm … :" boilerplate for cleaner UI copy.
        String lower = trimmed.toLowerCase();
        if (lower.startsWith("vi phạm chính sách nội dung (caption")) {
            return "Spam / nội dung tình dục trong caption hoặc mô tả video";
        }
        return trimmed;
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
