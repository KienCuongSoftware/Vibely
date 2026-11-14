package com.vibely.backend.subtitle;

import com.vibely.backend.video.Video;
import java.text.Normalizer;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.util.StringUtils;

/**
 * Music / lyric clips should not show Whisper ASR captions (often hallucinated CTAs).
 * Detection mirrors explore music keywords + common VN music hashtags.
 */
public final class MusicVideoCaptionPolicy {

    private static final Pattern HASHTAG = Pattern.compile("#([\\p{L}\\p{N}_]+)");

    private static final Set<String> MUSIC_HASHTAGS = Set.of(
        "music",
        "song",
        "lyrics",
        "lyric",
        "lyricvideo",
        "lofi",
        "karaoke",
        "remix",
        "cover",
        "edm",
        "hiphop",
        "rap",
        "ballad",
        "kpop",
        "vpop",
        "nhac",
        "amnhac",
        "nhachay",
        "nhachaymoingay",
        "nhacviet",
        "baihat",
        "singing",
        "soundtrack",
        "ost",
        "chillmusic",
        "lofimusic"
    );

    private static final Set<String> MUSIC_KEYWORDS = Set.of(
        "music",
        "song",
        "lyrics",
        "lyric",
        "lofi",
        "karaoke",
        "remix",
        "cover",
        "edm",
        "hiphop",
        "ballad",
        "kpop",
        "vpop",
        "amnhac",
        "am nhac",
        "nhac",
        "bai hat",
        "baihat",
        "nhac hay",
        "nhachay",
        "soundtrack",
        "melody"
    );

    private MusicVideoCaptionPolicy() {}

    public static boolean shouldSkipCaptions(Video video) {
        if (video == null) {
            return false;
        }
        return looksLikeMusic(video.getTitle(), video.getDescription(), video.getAudioTitle());
    }

    public static boolean looksLikeMusic(String title, String description, String audioTitle) {
        String haystack = String.join(
            " ",
            nullToEmpty(title),
            nullToEmpty(description),
            usableAudioTitle(audioTitle)
        );
        if (!StringUtils.hasText(haystack)) {
            return false;
        }

        Matcher matcher = HASHTAG.matcher(haystack);
        while (matcher.find()) {
            String tag = normalizeToken(matcher.group(1));
            if (MUSIC_HASHTAGS.contains(tag)) {
                return true;
            }
            // Compound tags: #nhachaymoingay, #lofivibes
            for (String musicTag : MUSIC_HASHTAGS) {
                if (tag.contains(musicTag)) {
                    return true;
                }
            }
        }

        String normalized = normalizeToken(haystack);
        String compact = normalized.replace(" ", "");
        for (String kw : MUSIC_KEYWORDS) {
            String needle = normalizeToken(kw);
            if (!StringUtils.hasText(needle)) {
                continue;
            }
            if (needle.contains(" ")) {
                if (normalized.contains(needle)) {
                    return true;
                }
            } else if (compact.contains(needle.replace(" ", ""))) {
                return true;
            }
        }
        return false;
    }

    private static String usableAudioTitle(String audioTitle) {
        String raw = nullToEmpty(audioTitle).trim();
        if (!StringUtils.hasText(raw)) {
            return "";
        }
        String normalized = normalizeToken(raw);
        // Default studio label is not a music signal.
        if (normalized.startsWith("original sound")
            || normalized.startsWith("am thanh goc")
            || normalized.startsWith("âm thanh gốc")) {
            return "";
        }
        return raw;
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    private static String normalizeToken(String raw) {
        if (raw == null) {
            return "";
        }
        String folded = Normalizer.normalize(raw, Normalizer.Form.NFD)
            .replaceAll("\\p{M}+", "")
            .toLowerCase(Locale.ROOT);
        return folded.replaceAll("[^\\p{L}\\p{N}\\s#]+", " ").replaceAll("\\s+", " ").trim();
    }
}
