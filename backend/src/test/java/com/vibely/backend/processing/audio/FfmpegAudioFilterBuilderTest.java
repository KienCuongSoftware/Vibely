package com.vibely.backend.processing.audio;

import static org.assertj.core.api.Assertions.assertThat;

import com.vibely.backend.processing.ProcessingProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class FfmpegAudioFilterBuilderTest {

    private FfmpegAudioFilterBuilder builder;

    @BeforeEach
    void setUp() {
        ProcessingProperties props = new ProcessingProperties();
        props.getAudio().setIntegratedLoudnessLufs(-12);
        props.getAudio().setLoudnessRange(11);
        props.getAudio().setTruePeakDb(-1.5);
        LoudnessNormalizationService loudness = new LoudnessNormalizationService(props);
        builder = new FfmpegAudioFilterBuilder(loudness, new MobileSpeakerOptimizer());
    }

    @Test
    void defaultProfileIncludesRequiredStagesWithoutEcho() {
        String chain = builder.buildFilterChain(AudioMasteringProfile.DEFAULT);
        assertThat(chain).contains("highpass=f=80");
        assertThat(chain).contains("equalizer=f=220");
        assertThat(chain).contains("equalizer=f=3200");
        assertThat(chain).doesNotContain("aecho=");
        assertThat(chain).contains("acompressor=");
        assertThat(chain).contains("alimiter=limit=-1.5dB");
        assertThat(chain).contains("loudnorm=I=-12.0:LRA=11.0:TP=-1.5");
    }

    @Test
    void speechProfileUsesStrongerVocalEq() {
        String chain = builder.buildFilterChain(AudioMasteringProfile.SPEECH);
        assertThat(chain).contains("highpass=f=100");
        assertThat(chain).contains("equalizer=f=3000:t=q:w=1:g=3");
        assertThat(chain).doesNotContain("aecho=");
    }

    @Test
    void musicProfileDiffersFromDefaultAndSkipsEcho() {
        String defaultChain = builder.buildFilterChain(AudioMasteringProfile.DEFAULT);
        String musicChain = builder.buildFilterChain(AudioMasteringProfile.MUSIC);
        assertThat(musicChain).isNotEqualTo(defaultChain);
        assertThat(musicChain).contains("highpass=f=55");
        assertThat(musicChain).doesNotContain("aecho=");
    }

    @Test
    void twoPassLoudnormUsesMeasuredParams() {
        var measured = new LoudnessNormalizationService.LoudnormMeasurement(
            -18.4,
            -2.1,
            6.2,
            -28.5,
            0.4
        );
        String chain = builder.buildFilterChain(AudioMasteringProfile.DEFAULT, measured);
        assertThat(chain).contains("measured_I=-18.40");
        assertThat(chain).contains("linear=true");
    }
}
