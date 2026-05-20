package com.vibely.backend.processing.audio;

/**
 * Lightweight audio characteristics from ffprobe / volumedetect heuristics.
 */
public record AudioAnalysisSnapshot(
    boolean hasAudioStream,
    int channels,
    int sampleRateHz,
    long bitRateBps,
    double durationSeconds,
    Double meanVolumeDb,
    Double maxVolumeDb,
    boolean likelyNoisy,
    boolean likelyBassHeavy
) {
    public static AudioAnalysisSnapshot empty() {
        return new AudioAnalysisSnapshot(false, 0, 0, 0, 0, null, null, false, false);
    }
}
