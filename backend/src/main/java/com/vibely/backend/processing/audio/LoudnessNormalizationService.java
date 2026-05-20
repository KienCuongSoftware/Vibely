package com.vibely.backend.processing.audio;

import com.vibely.backend.processing.ProcessingProperties;
import java.util.Locale;
import org.springframework.stereotype.Component;

/**
 * Target loudness for streaming UGC (mobile-first, punchy but not clipped).
 */
@Component
public class LoudnessNormalizationService {

    private final ProcessingProperties processingProperties;

    public LoudnessNormalizationService(ProcessingProperties processingProperties) {
        this.processingProperties = processingProperties;
    }

    public double integratedLoudnessLufs() {
        return processingProperties.getAudio().getIntegratedLoudnessLufs();
    }

    public double truePeakDb() {
        return processingProperties.getAudio().getTruePeakDb();
    }

    public double loudnessRange() {
        return processingProperties.getAudio().getLoudnessRange();
    }

    /**
     * FFmpeg {@code loudnorm} filter fragment (no leading filter name).
     */
    public String loudnormFilterSegment() {
        ProcessingProperties.Audio audio = processingProperties.getAudio();
        return String.format(
            Locale.US,
            "loudnorm=I=%.1f:LRA=%.1f:TP=%.1f",
            audio.getIntegratedLoudnessLufs(),
            audio.getLoudnessRange(),
            audio.getTruePeakDb()
        );
    }
}
