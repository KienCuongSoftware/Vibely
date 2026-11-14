package com.vibely.backend.subtitle;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.util.StringUtils;

/**
 * Decide whether ASR cues are real speech captions worth showing.
 *
 * <p>Does <strong>not</strong> rely on user caption/hashtags alone. Primary signals:
 * <ul>
 *   <li>Explore {@code music} category (structured classification)</li>
 *   <li>Whisper hallucination / CTA patterns</li>
 *   <li>Absurd timing (one cue covering almost the whole clip — common on music)</li>
 * </ul>
 */
public final class AsrCaptionEligibility {

    /** Known Whisper hallucinations on music / silence (VN + EN). */
    private static final Set<String> HALLUCINATION_PHRASES = Set.of(
        "subscribe",
        "like and subscribe",
        "thanks for watching",
        "thank you for watching",
        "please subscribe",
        "dang ky",
        "dang ky kenh",
        "hay subscribe",
        "hay dang ky",
        "cam on da xem",
        "cam on cac ban da xem",
        "ghiền mì gõ",
        "ghien mi go",
        "khong bo lo nhung video",
        "don't forget to subscribe",
        "nhấn like",
        "nhan like",
        "bấm like",
        "bam like"
    );

    private static final Pattern NON_LETTER = Pattern.compile("[^\\p{L}\\p{N}\\s]+");

    /** One cue covering this much of the clip is almost never real dialogue. */
    private static final double MAX_SINGLE_CUE_COVERAGE = 0.72;

    private AsrCaptionEligibility() {}

    /**
     * Drop cues that look like hallucinations or non-speech timing artifacts.
     * Returns empty when nothing reliable remains.
     */
    public static List<SubtitleCueDto> filterReliableCues(
        List<SubtitleCueDto> cues,
        Integer durationSeconds
    ) {
        if (cues == null || cues.isEmpty()) {
            return List.of();
        }
        int durationMs = durationSeconds != null && durationSeconds > 0
            ? durationSeconds * 1000
            : estimateDurationMs(cues);

        List<SubtitleCueDto> kept = new ArrayList<>();
        for (SubtitleCueDto cue : cues) {
            if (cue == null || !StringUtils.hasText(cue.text())) {
                continue;
            }
            if (looksLikeHallucination(cue.text())) {
                continue;
            }
            if (durationMs > 0 && coversTooMuchOfClip(cue, durationMs) && cues.size() <= 2) {
                continue;
            }
            kept.add(cue);
        }

        // Music-like: tiny cue count spanning nearly the whole video.
        if (kept.size() == 1 && durationMs > 0 && coversTooMuchOfClip(kept.get(0), durationMs)) {
            return List.of();
        }
        return List.copyOf(kept);
    }

    public static boolean looksLikeHallucination(String text) {
        String normalized = normalize(text);
        if (!StringUtils.hasText(normalized)) {
            return true;
        }
        for (String phrase : HALLUCINATION_PHRASES) {
            if (normalized.contains(phrase)) {
                return true;
            }
        }
        return false;
    }

    private static boolean coversTooMuchOfClip(SubtitleCueDto cue, int durationMs) {
        int span = Math.max(0, cue.endMs() - cue.startMs());
        return span >= (int) (durationMs * MAX_SINGLE_CUE_COVERAGE);
    }

    private static int estimateDurationMs(List<SubtitleCueDto> cues) {
        int maxEnd = 0;
        for (SubtitleCueDto cue : cues) {
            if (cue != null) {
                maxEnd = Math.max(maxEnd, cue.endMs());
            }
        }
        return maxEnd;
    }

    private static String normalize(String raw) {
        String folded = Normalizer.normalize(String.valueOf(raw), Normalizer.Form.NFD)
            .replaceAll("\\p{M}+", "")
            .toLowerCase(Locale.ROOT);
        return NON_LETTER.matcher(folded).replaceAll(" ").replaceAll("\\s+", " ").trim();
    }
}
