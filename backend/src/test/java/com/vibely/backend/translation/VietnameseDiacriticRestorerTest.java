package com.vibely.backend.translation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class VietnameseDiacriticRestorerTest {

    private final VietnameseDiacriticRestorer restorer = new VietnameseDiacriticRestorer();

    @Test
    void restoresCommonUnaccentedCaption() {
        String input = "Son Thuy Trung May x Thuy Chung";
        String out = restorer.restore(input);
        assertEquals("Sơn Thủy Trùng Mây x Thủy Chung", out);
        assertTrue(restorer.changesText(input));
    }

    @Test
    void leavesAccentedTextUnchanged() {
        String input = "Sơn Thủy Trùng Mây";
        assertEquals(input, restorer.restore(input));
        assertFalse(restorer.changesText(input));
    }

    @Test
    void keepsHashtagsAndMentions() {
        String input = "nhac hay @user #fyp remix";
        String out = restorer.restore(input);
        assertTrue(out.contains("@user"));
        assertTrue(out.contains("#fyp"));
        assertTrue(out.contains("nhạc"));
    }
}
