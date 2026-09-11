package com.vibely.backend.processing.audio;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.vibely.backend.processing.ProcessingProperties;
import java.nio.file.Path;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class AudioEnhancementServiceTest {

    @Test
    void returnsPassthroughWhenDisabled() {
        ProcessingProperties props = new ProcessingProperties();
        props.getAudio().setEnabled(false);
        props.getAudio().setBitrateKbps(256);
        AudioProfileAnalyzer analyzer = mock(AudioProfileAnalyzer.class);
        LoudnessNormalizationService loudness = new LoudnessNormalizationService(props);
        FfmpegAudioFilterBuilder filterBuilder = new FfmpegAudioFilterBuilder(
            loudness,
            new MobileSpeakerOptimizer()
        );
        AudioEnhancementService service = new AudioEnhancementService(
            props,
            analyzer,
            filterBuilder,
            loudness
        );

        AudioProcessingResult result = service.planEnhancement(Path.of("x.mp4"), Path.of("."));
        assertThat(result.enhancementApplied()).isFalse();
        assertThat(result.notes()).contains("disabled");
        assertThat(result.audioBitrateKbps()).isEqualTo(256);
    }

    @Test
    void buildsFilterChainWhenEnabled() {
        ProcessingProperties props = new ProcessingProperties();
        props.getAudio().setEnabled(true);
        props.getAudio().setVolumeDetectEnabled(false);
        props.getAudio().setBitrateKbps(256);

        AudioProfileAnalyzer analyzer = mock(AudioProfileAnalyzer.class);
        when(analyzer.analyze(any(), any())).thenReturn(
            new AudioAnalysisSnapshot(true, 2, 48_000, 128_000, 10, null, null, false, false)
        );
        when(analyzer.selectProfile(any())).thenReturn(AudioMasteringProfile.DEFAULT);

        LoudnessNormalizationService loudness = mock(LoudnessNormalizationService.class);
        when(loudness.integratedLoudnessLufs()).thenReturn(-12.0);
        when(loudness.truePeakDb()).thenReturn(-1.5);
        when(loudness.measure(any(), any(), anyString())).thenReturn(Optional.empty());
        when(loudness.loudnormFilterSegment()).thenReturn("loudnorm=I=-12.0:LRA=11.0:TP=-1.5");

        FfmpegAudioFilterBuilder filterBuilder = new FfmpegAudioFilterBuilder(
            loudness,
            new MobileSpeakerOptimizer()
        );
        AudioEnhancementService service = new AudioEnhancementService(
            props,
            analyzer,
            filterBuilder,
            loudness
        );

        AudioProcessingResult result = service.planEnhancement(Path.of("x.mp4"), Path.of("."));
        assertThat(result.enhancementApplied()).isTrue();
        assertThat(result.hasAudioFilter()).isTrue();
        assertThat(result.filterChain()).contains("loudnorm");
        assertThat(result.audioBitrateKbps()).isEqualTo(256);
        assertThat(result.sampleRateHz()).isEqualTo(48_000);
    }

    @Test
    void fallsBackOnAnalyzerFailure() {
        ProcessingProperties props = new ProcessingProperties();
        props.getAudio().setEnabled(true);
        props.getAudio().setBitrateKbps(256);
        AudioProfileAnalyzer analyzer = mock(AudioProfileAnalyzer.class);
        when(analyzer.analyze(any(), any())).thenThrow(new RuntimeException("ffprobe missing"));

        LoudnessNormalizationService loudness = new LoudnessNormalizationService(props);
        AudioEnhancementService service = new AudioEnhancementService(
            props,
            analyzer,
            new FfmpegAudioFilterBuilder(loudness, new MobileSpeakerOptimizer()),
            loudness
        );

        AudioProcessingResult result = service.planEnhancement(Path.of("x.mp4"), Path.of("."));
        assertThat(result.enhancementApplied()).isFalse();
        assertThat(result.hasAudioStream()).isTrue();
        assertThat(result.audioBitrateKbps()).isEqualTo(256);
    }
}
