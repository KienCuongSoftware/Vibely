package com.vibely.backend.video.service;

import com.vibely.backend.user.entity.User;
import java.util.regex.Pattern;

final class VideoMediaUtils {

    static final Pattern VIDEO_EXT_PATTERN = Pattern.compile("\\.(mp4|webm|mov)(\\?.*)?$", Pattern.CASE_INSENSITIVE);
    static final Pattern REGEX_META_PATTERN = Pattern.compile("([\\\\.^$|?*+()\\[\\]{}-])");

    private VideoMediaUtils() {
    }

    static String resolveAuthorDisplayName(User author) {
        String raw = author.getDisplayName();
        if (raw != null && !raw.isBlank()) {
            return raw.trim();
        }
        return author.getUsername();
    }

    static String normalizeText(String raw) {
        if (raw == null) {
            return null;
        }
        String trimmed = raw.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    static String normalizeHashtag(String raw) {
        String normalized = normalizeText(raw);
        if (normalized == null) {
            return null;
        }
        String withoutHash = normalized.replaceFirst("^#+", "").trim();
        return withoutHash.isEmpty() ? null : withoutHash;
    }

    static String escapeRegexLiteral(String raw) {
        return REGEX_META_PATTERN.matcher(raw).replaceAll("\\\\$1");
    }

    static String deriveAudioUrlFromVideoUrl(String videoUrl) {
        String normalizedVideoUrl = normalizeText(videoUrl);
        if (normalizedVideoUrl == null) {
            return null;
        }
        String mp3 = VIDEO_EXT_PATTERN.matcher(normalizedVideoUrl).replaceFirst(".mp3$2");
        if (mp3.equals(normalizedVideoUrl)) {
            return null;
        }
        return mp3.replace("/uploads/", "/audios/");
    }
}
