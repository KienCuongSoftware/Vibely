package com.vibely.backend.processing.audio;

/**
 * Planned audio treatment for one transcode job (filter chain + encoding targets).
 */
public record AudioProcessingResult(
    boolean enhancementApplied,
    boolean hasAudioStream,
    AudioMasteringProfile profile,
    String filterChain,
    double integratedLoudnessLufs,
    double truePeakDb,
    int audioBitrateKbps,
    int sampleRateHz,
    String notes
) {
    public static AudioProcessingResult noAudioStream() {
        return new AudioProcessingResult(
            false,
            false,
            AudioMasteringProfile.DEFAULT,
            "",
            -12.0,
            -1.0,
            128,
            48_000,
            "no audio stream"
        );
    }

    public static AudioProcessingResult passthrough(String reason) {
        return new AudioProcessingResult(
            false,
            true,
            AudioMasteringProfile.DEFAULT,
            "",
            -12.0,
            -1.0,
            128,
            48_000,
            reason
        );
    }

    public static AudioProcessingResult enhanced(
        AudioMasteringProfile profile,
        String filterChain,
        double integratedLoudnessLufs,
        double truePeakDb,
        int audioBitrateKbps,
        int sampleRateHz
    ) {
        return new AudioProcessingResult(
            true,
            true,
            profile,
            filterChain,
            integratedLoudnessLufs,
            truePeakDb,
            audioBitrateKbps,
            sampleRateHz,
            "enhanced"
        );
    }

    public boolean hasAudioFilter() {
        return enhancementApplied && filterChain != null && !filterChain.isBlank();
    }

    public String audioBitrateArg() {
        return audioBitrateKbps + "k";
    }
}
