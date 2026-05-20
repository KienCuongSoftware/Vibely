package com.vibely.backend.processing.audio;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vibely.backend.processing.ProcessingProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class AudioProfileAnalyzerTest {

    private AudioProfileAnalyzer analyzer;

    @BeforeEach
    void setUp() {
        ProcessingProperties props = new ProcessingProperties();
        props.getAudio().setVolumeDetectEnabled(false);
        analyzer = new AudioProfileAnalyzer(props, new ObjectMapper());
    }

    @Test
    void selectsSpeechForMono() {
        AudioAnalysisSnapshot snap = new AudioAnalysisSnapshot(
            true,
            1,
            44_100,
            96_000,
            12,
            null,
            null,
            false,
            false
        );
        assertThat(analyzer.selectProfile(snap)).isEqualTo(AudioMasteringProfile.SPEECH);
    }

    @Test
    void selectsMusicForBassHeavyHeuristic() {
        AudioAnalysisSnapshot snap = new AudioAnalysisSnapshot(
            true,
            2,
            48_000,
            256_000,
            20,
            -14.0,
            -3.0,
            false,
            true
        );
        assertThat(analyzer.selectProfile(snap)).isEqualTo(AudioMasteringProfile.MUSIC);
    }

    @Test
    void selectsCinematicForLongHighBitrateStereo() {
        AudioAnalysisSnapshot snap = new AudioAnalysisSnapshot(
            true,
            2,
            48_000,
            192_000,
            60,
            -18.0,
            -6.0,
            false,
            false
        );
        assertThat(analyzer.selectProfile(snap)).isEqualTo(AudioMasteringProfile.CINEMATIC);
    }

    @Test
    void defaultsWhenStereoModerateBitrate() {
        AudioAnalysisSnapshot snap = new AudioAnalysisSnapshot(
            true,
            2,
            44_100,
            128_000,
            15,
            -20.0,
            -8.0,
            false,
            false
        );
        assertThat(analyzer.selectProfile(snap)).isEqualTo(AudioMasteringProfile.MUSIC);
    }
}
