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
        props.getAudio().setLoudnessRange(7);
        props.getAudio().setTruePeakDb(-1);
        LoudnessNormalizationService loudness = new LoudnessNormalizationService(props);
        builder = new FfmpegAudioFilterBuilder(loudness, new MobileSpeakerOptimizer());
    }

    @Test
    void defaultProfileIncludesRequiredStages() {
        String chain = builder.buildFilterChain(AudioMasteringProfile.DEFAULT);
        assertThat(chain).contains("highpass=f=80");
        assertThat(chain).contains("equalizer=f=250");
        assertThat(chain).contains("equalizer=f=3500");
        assertThat(chain).contains("acompressor=");
        assertThat(chain).contains("alimiter=limit=-1dB");
        assertThat(chain).contains("loudnorm=I=-12.0:LRA=7.0:TP=-1.0");
    }

    @Test
    void speechProfileUsesStrongerVocalEq() {
        String chain = builder.buildFilterChain(AudioMasteringProfile.SPEECH);
        assertThat(chain).contains("highpass=f=100");
        assertThat(chain).contains("equalizer=f=3500:t=q:w=1:g=4");
    }

    @Test
    void musicProfileDiffersFromDefault() {
        String defaultChain = builder.buildFilterChain(AudioMasteringProfile.DEFAULT);
        String musicChain = builder.buildFilterChain(AudioMasteringProfile.MUSIC);
        assertThat(musicChain).isNotEqualTo(defaultChain);
        assertThat(musicChain).contains("highpass=f=70");
    }
}
