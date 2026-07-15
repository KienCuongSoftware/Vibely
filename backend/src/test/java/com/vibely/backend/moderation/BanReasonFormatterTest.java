package com.vibely.backend.moderation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import org.junit.jupiter.api.Test;

class BanReasonFormatterTest {

    @Test
    void captionReasonIsHumanReadable() {
        String reason = BanReasonFormatter.forCaptionViolation("Follow of nudes", null);
        assertEquals("Spam / nội dung tình dục trong caption: \"Follow of nudes\"", reason);
        assertFalse(reason.contains("\\b"));
    }

    @Test
    void displayHidesLegacyRegexLeak() {
        String legacy =
            "Vi phạm chính sách nội dung (caption spam/tình dục): \\bfollow\\s*(?:for|of|4)\\s*nudes?\\b";
        assertEquals(
            "Spam / nội dung tình dục trong caption hoặc mô tả video",
            BanReasonFormatter.forDisplay(legacy)
        );
    }
}
