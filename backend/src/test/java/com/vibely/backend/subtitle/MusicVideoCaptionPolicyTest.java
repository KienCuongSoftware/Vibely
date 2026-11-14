package com.vibely.backend.subtitle;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class MusicVideoCaptionPolicyTest {

    @Test
    void detectsMusicHashtags() {
        assertTrue(
            MusicVideoCaptionPolicy.looksLikeMusic(
                "Trót yêu nhau",
                "clip #nhachaymoingay #lofi #lyrics",
                null
            )
        );
    }

    @Test
    void ignoresNormalTalkingClip() {
        assertFalse(
            MusicVideoCaptionPolicy.looksLikeMusic(
                "Vlog đi khám",
                "Khi bạn và anh trai đi khám #fyp #funny",
                "original sound - Demo"
            )
        );
    }
}
