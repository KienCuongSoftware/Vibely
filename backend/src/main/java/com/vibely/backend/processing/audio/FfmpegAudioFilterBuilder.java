package com.vibely.backend.processing.audio;

import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;

/**
 * Builds FFmpeg {@code -af} filter graphs for mastering profiles.
 */
@Component
public class FfmpegAudioFilterBuilder {

    private final LoudnessNormalizationService loudnessNormalizationService;
    private final MobileSpeakerOptimizer mobileSpeakerOptimizer;

    public FfmpegAudioFilterBuilder(
        LoudnessNormalizationService loudnessNormalizationService,
        MobileSpeakerOptimizer mobileSpeakerOptimizer
    ) {
        this.loudnessNormalizationService = loudnessNormalizationService;
        this.mobileSpeakerOptimizer = mobileSpeakerOptimizer;
    }

    public String buildFilterChain(AudioMasteringProfile profile) {
        List<String> segments = new ArrayList<>();
        segments.addAll(profileCoreSegments(profile));
        segments.add(mobileSpeakerOptimizer.mobileEqSegments(profile));
        segments.addAll(dynamicsSegments(profile));
        segments.add(loudnessNormalizationService.loudnormFilterSegment());
        return String.join(",", segments);
    }

    private static List<String> profileCoreSegments(AudioMasteringProfile profile) {
        return switch (profile) {
            case SPEECH -> List.of(
                "highpass=f=100",
                "equalizer=f=250:t=q:w=1:g=1.5",
                "equalizer=f=3500:t=q:w=1:g=4"
            );
            case MUSIC -> List.of(
                "highpass=f=70",
                "equalizer=f=250:t=q:w=1:g=2.5",
                "equalizer=f=3200:t=q:w=1:g=2"
            );
            case CINEMATIC -> List.of(
                "highpass=f=50",
                "equalizer=f=200:t=q:w=1:g=1",
                "equalizer=f=4000:t=q:w=1:g=2"
            );
            case DEFAULT -> List.of(
                "highpass=f=80",
                "equalizer=f=250:t=q:w=1:g=2",
                "equalizer=f=3500:t=q:w=1:g=3"
            );
        };
    }

    private static List<String> dynamicsSegments(AudioMasteringProfile profile) {
        return switch (profile) {
            case SPEECH -> List.of(
                "acompressor=threshold=-20dB:ratio=2.5:attack=15:release=120",
                "alimiter=limit=-1dB"
            );
            case MUSIC -> List.of(
                "acompressor=threshold=-18dB:ratio=3:attack=20:release=150",
                "alimiter=limit=-1dB"
            );
            case CINEMATIC -> List.of(
                "acompressor=threshold=-22dB:ratio=2:attack=25:release=200",
                "alimiter=limit=-1dB"
            );
            case DEFAULT -> List.of(
                "acompressor=threshold=-18dB:ratio=3:attack=20:release=150",
                "alimiter=limit=-1dB"
            );
        };
    }
}
