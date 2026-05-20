package com.vibely.backend.processing.audio;

import com.vibely.backend.processing.ProcessingProperties;
import java.nio.file.Path;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Plans TikTok-style audio mastering for the HLS transcode step (never fails the video job).
 */
@Service
public class AudioEnhancementService {

    private static final Logger log = LoggerFactory.getLogger(AudioEnhancementService.class);

    private final ProcessingProperties processingProperties;
    private final AudioProfileAnalyzer profileAnalyzer;
    private final FfmpegAudioFilterBuilder filterBuilder;
    private final LoudnessNormalizationService loudnessNormalizationService;

    public AudioEnhancementService(
        ProcessingProperties processingProperties,
        AudioProfileAnalyzer profileAnalyzer,
        FfmpegAudioFilterBuilder filterBuilder,
        LoudnessNormalizationService loudnessNormalizationService
    ) {
        this.processingProperties = processingProperties;
        this.profileAnalyzer = profileAnalyzer;
        this.filterBuilder = filterBuilder;
        this.loudnessNormalizationService = loudnessNormalizationService;
    }

    /**
     * @param input  local source file
     * @param workDir temp directory for probe logs
     */
    public AudioProcessingResult planEnhancement(Path input, Path workDir) {
        ProcessingProperties.Audio audio = processingProperties.getAudio();
        int bitrate = audio.getBitrateKbps();
        int sampleRate = audio.getSampleRateHz();
        double lufs = loudnessNormalizationService.integratedLoudnessLufs();
        double tp = loudnessNormalizationService.truePeakDb();

        if (!audio.isEnabled()) {
            log.info("audio enhancement disabled in config; passthrough AAC encode");
            return AudioProcessingResult.passthrough("enhancement disabled");
        }

        long started = System.nanoTime();
        try {
            AudioAnalysisSnapshot snapshot = profileAnalyzer.analyze(input, workDir);
            if (!snapshot.hasAudioStream()) {
                log.info("audio plan: no audio stream; encode without -af");
                return AudioProcessingResult.noAudioStream();
            }

            AudioMasteringProfile profile = profileAnalyzer.selectProfile(snapshot);
            String filterChain = filterBuilder.buildFilterChain(profile);
            long ms = (System.nanoTime() - started) / 1_000_000;

            log.info(
                "audio plan: profile={} LUFS={} TP={}dB bitrate={}k sampleRate={}Hz "
                    + "channels={} durationSec={} meanVol={} maxVol={} filterChain={} analysisMs={}",
                profile,
                lufs,
                tp,
                bitrate,
                sampleRate,
                snapshot.channels(),
                String.format("%.1f", snapshot.durationSeconds()),
                snapshot.meanVolumeDb(),
                snapshot.maxVolumeDb(),
                filterChain,
                ms
            );

            return AudioProcessingResult.enhanced(profile, filterChain, lufs, tp, bitrate, sampleRate);
        } catch (Exception e) {
            log.warn(
                "audio enhancement planning failed; falling back to passthrough AAC (video job continues): {}",
                e.toString()
            );
            return AudioProcessingResult.passthrough("planning failed: " + e.getMessage());
        }
    }
}
