package com.vibely.backend.subtitle;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import org.junit.jupiter.api.Test;

class AsrCaptionEligibilityTest {

    @Test
    void dropsSubscribeHallucinationSpanningWholeClip() {
        List<SubtitleCueDto> cues = List.of(
            new SubtitleCueDto(
                370,
                23370,
                "Hãy subscribe cho kênh Ghiền Mì Gõ Để không bỏ lỡ những video hấp dẫn"
            )
        );
        assertTrue(AsrCaptionEligibility.filterReliableCues(cues, 23).isEmpty());
    }

    @Test
    void keepsNormalDialogueCues() {
        List<SubtitleCueDto> cues = List.of(
            new SubtitleCueDto(0, 1800, "Xin chào mọi người"),
            new SubtitleCueDto(2000, 4200, "Hôm nay mình đi khám")
        );
        assertEquals(2, AsrCaptionEligibility.filterReliableCues(cues, 30).size());
    }
}
