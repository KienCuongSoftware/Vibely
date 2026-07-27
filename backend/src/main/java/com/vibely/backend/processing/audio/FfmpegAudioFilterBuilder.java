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
                // Punchier bass + presence, light early reflection for “TikTok room” feel.
                "highpass=f=60",
                "equalizer=f=90:t=q:w=1:g=1.5",
                "equalizer=f=220:t=q:w=1:g=3",
                "equalizer=f=3200:t=q:w=1:g=2.5",
                "equalizer=f=8000:t=q:w=1:g=1.5",
                "aecho=0.8:0.88:55:0.18"
            );
            case CINEMATIC -> List.of(
                "highpass=f=50",
                "equalizer=f=200:t=q:w=1:g=1.5",
                "equalizer=f=4000:t=q:w=1:g=2.5",
                "aecho=0.8:0.9:80:0.15"
            );
            case DEFAULT -> List.of(
                "highpass=f=80",
                "equalizer=f=250:t=q:w=1:g=2.5",
                "equalizer=f=3500:t=q:w=1:g=3.5",
                "aecho=0.8:0.9:45:0.12"
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
                "acompressor=threshold=-16dB:ratio=3.5:attack=18:release=140",
                "alimiter=limit=-1dB"
            );
            case CINEMATIC -> List.of(
                "acompressor=threshold=-20dB:ratio=2.2:attack=25:release=200",
                "alimiter=limit=-1dB"
            );
            case DEFAULT -> List.of(
                "acompressor=threshold=-17dB:ratio=3.2:attack=18:release=140",
                "alimiter=limit=-1dB"
            );
        };
    }
}
