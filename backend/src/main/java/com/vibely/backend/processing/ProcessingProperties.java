package com.vibely.backend.processing;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.NestedConfigurationProperty;

/**
 * Async video pipeline: enqueue on upload, optional in-process worker with FFmpeg, or dry-run promotion for dev.
 */
@ConfigurationProperties(prefix = "app.processing")
public class ProcessingProperties {

    /**
     * When true, a scheduled worker pulls {@link VideoProcessingJobEntity} rows and runs FFmpeg + S3 uploads.
     * Run dedicated instances with this enabled for horizontal scale; keep API pods with this false.
     */
    @NestedConfigurationProperty
    private Worker worker = new Worker();

    /**
     * If the FFmpeg worker is off, promote RAW → READY after DB commit without transcoding (keeps tests/local UX).
     * Disable in production when the real worker is deployed.
     */
    private boolean dryRunPromoteWhenWorkerDisabled = true;

    private int pollIntervalMs = 5000;

    private String ffmpegPath = "ffmpeg";

    private String ffprobePath = "ffprobe";

    private int maxJobAttempts = 3;

    @NestedConfigurationProperty
    private Audio audio = new Audio();

    public Worker getWorker() {
        return worker;
    }

    public void setWorker(Worker worker) {
        this.worker = worker;
    }

    public boolean isDryRunPromoteWhenWorkerDisabled() {
        return dryRunPromoteWhenWorkerDisabled;
    }

    public void setDryRunPromoteWhenWorkerDisabled(boolean dryRunPromoteWhenWorkerDisabled) {
        this.dryRunPromoteWhenWorkerDisabled = dryRunPromoteWhenWorkerDisabled;
    }

    public int getPollIntervalMs() {
        return pollIntervalMs;
    }

    public void setPollIntervalMs(int pollIntervalMs) {
        this.pollIntervalMs = pollIntervalMs;
    }

    public String getFfmpegPath() {
        return ffmpegPath;
    }

    public void setFfmpegPath(String ffmpegPath) {
        this.ffmpegPath = ffmpegPath;
    }

    public String getFfprobePath() {
        return ffprobePath;
    }

    public void setFfprobePath(String ffprobePath) {
        this.ffprobePath = ffprobePath;
    }

    public int getMaxJobAttempts() {
        return maxJobAttempts;
    }

    public void setMaxJobAttempts(int maxJobAttempts) {
        this.maxJobAttempts = maxJobAttempts;
    }

    public Audio getAudio() {
        return audio;
    }

    public void setAudio(Audio audio) {
        this.audio = audio;
    }

    /**
     * Mobile-first mastering during HLS transcode (FFmpeg {@code -af} chain).
     */
    public static class Audio {

        private boolean enabled = true;

        /** Run an extra ffmpeg volumedetect pass for profile heuristics. */
        private boolean volumeDetectEnabled = true;

        private double integratedLoudnessLufs = -12.0;

        private double loudnessRange = 7.0;

        private double truePeakDb = -1.0;

        private int bitrateKbps = 128;

        private int sampleRateHz = 48_000;

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }

        public boolean isVolumeDetectEnabled() {
            return volumeDetectEnabled;
        }

        public void setVolumeDetectEnabled(boolean volumeDetectEnabled) {
            this.volumeDetectEnabled = volumeDetectEnabled;
        }

        public double getIntegratedLoudnessLufs() {
            return integratedLoudnessLufs;
        }

        public void setIntegratedLoudnessLufs(double integratedLoudnessLufs) {
            this.integratedLoudnessLufs = integratedLoudnessLufs;
        }

        public double getLoudnessRange() {
            return loudnessRange;
        }

        public void setLoudnessRange(double loudnessRange) {
            this.loudnessRange = loudnessRange;
        }

        public double getTruePeakDb() {
            return truePeakDb;
        }

        public void setTruePeakDb(double truePeakDb) {
            this.truePeakDb = truePeakDb;
        }

        public int getBitrateKbps() {
            return bitrateKbps;
        }

        public void setBitrateKbps(int bitrateKbps) {
            this.bitrateKbps = bitrateKbps;
        }

        public int getSampleRateHz() {
            return sampleRateHz;
        }

        public void setSampleRateHz(int sampleRateHz) {
            this.sampleRateHz = sampleRateHz;
        }
    }

    public static class Worker {

        private boolean enabled = false;

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }
    }
}
