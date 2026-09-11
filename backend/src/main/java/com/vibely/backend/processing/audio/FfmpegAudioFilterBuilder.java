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

    /** Full chain including loudnorm (single-pass fallback or two-pass when measured). */
    public String buildFilterChain(AudioMasteringProfile profile) {
        return buildFilterChain(profile, null);
    }

    public String buildFilterChain(
        AudioMasteringProfile profile,
        LoudnessNormalizationService.LoudnormMeasurement measurement
    ) {
        String core = buildMasteringChainWithoutLoudnorm(profile);
        String loudnorm = measurement == null
            ? loudnessNormalizationService.loudnormFilterSegment()
            : loudnessNormalizationService.loudnormFilterSegment(measurement);
        return core + "," + loudnorm;
    }

    /** EQ + dynamics only — used for loudnorm measure pass and final chain assembly. */
    public String buildMasteringChainWithoutLoudnorm(AudioMasteringProfile profile) {
        List<String> segments = new ArrayList<>();
        segments.addAll(profileCoreSegments(profile));
        segments.add(mobileSpeakerOptimizer.mobileEqSegments(profile));
        segments.addAll(dynamicsSegments(profile));
        return String.join(",", segments);
    }

    private static List<String> profileCoreSegments(AudioMasteringProfile profile) {
        return switch (profile) {
            case SPEECH -> List.of(
                "highpass=f=100",
                "equalizer=f=250:t=q:w=1:g=1.2",
                "equalizer=f=3000:t=q:w=1:g=3",
                "equalizer=f=6000:t=q:w=1.2:g=1"
            );
            case MUSIC -> List.of(
                "highpass=f=55",
                "equalizer=f=90:t=q:w=1:g=2",
                "equalizer=f=220:t=q:w=1:g=2",
                "equalizer=f=3200:t=q:w=1:g=2",
                "equalizer=f=10000:t=q:w=1:g=1.5"
            );
            case CINEMATIC -> List.of(
                "highpass=f=45",
                "equalizer=f=180:t=q:w=1:g=1.2",
                "equalizer=f=3500:t=q:w=1:g=2",
                "equalizer=f=9000:t=q:w=1:g=1"
            );
            case DEFAULT -> List.of(
                "highpass=f=80",
                "equalizer=f=220:t=q:w=1:g=1.5",
                "equalizer=f=3200:t=q:w=1:g=2.5",
                "equalizer=f=8000:t=q:w=1.2:g=1.2"
            );
        };
    }

    private static List<String> dynamicsSegments(AudioMasteringProfile profile) {
        return switch (profile) {
            case SPEECH -> List.of(
                "acompressor=threshold=-18dB:ratio=2.2:attack=12:release=100:makeup=1",
                "alimiter=limit=-1.5dB"
            );
            case MUSIC -> List.of(
                "acompressor=threshold=-18dB:ratio=2.8:attack=20:release=160:makeup=1",
                "alimiter=limit=-1.5dB"
            );
            case CINEMATIC -> List.of(
                "acompressor=threshold=-20dB:ratio=2:attack=28:release=220:makeup=1",
                "alimiter=limit=-1.5dB"
            );
            case DEFAULT -> List.of(
                "acompressor=threshold=-18dB:ratio=2.6:attack=18:release=140:makeup=1",
                "alimiter=limit=-1.5dB"
            );
        };
    }
}
