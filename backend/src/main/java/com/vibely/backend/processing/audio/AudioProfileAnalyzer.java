package com.vibely.backend.processing.audio;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vibely.backend.processing.ProcessingProperties;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Classifies uploads for a mastering profile using ffprobe metadata and optional volumedetect.
 */
@Component
public class AudioProfileAnalyzer {

    private static final Logger log = LoggerFactory.getLogger(AudioProfileAnalyzer.class);

    private static final Pattern MEAN_VOLUME = Pattern.compile("mean_volume:\\s*([-\\d.]+)\\s*dB");
    private static final Pattern MAX_VOLUME = Pattern.compile("max_volume:\\s*([-\\d.]+)\\s*dB");

    private final ProcessingProperties processingProperties;
    private final ObjectMapper objectMapper;

    public AudioProfileAnalyzer(ProcessingProperties processingProperties, ObjectMapper objectMapper) {
        this.processingProperties = processingProperties;
        this.objectMapper = objectMapper;
    }

    public AudioAnalysisSnapshot analyze(Path input, Path workDir) {
        AudioAnalysisSnapshot probe = probeStreams(input, workDir);
        if (!probe.hasAudioStream()) {
            return probe;
        }
        if (!processingProperties.getAudio().isVolumeDetectEnabled()) {
            return probe;
        }
        try {
            VolumeStats stats = runVolumeDetect(input, workDir);
            return new AudioAnalysisSnapshot(
                true,
                probe.channels(),
                probe.sampleRateHz(),
                probe.bitRateBps(),
                probe.durationSeconds(),
                stats.meanDb,
                stats.maxDb,
                classifyNoisy(stats),
                classifyBassHeavy(stats, probe)
            );
        } catch (Exception e) {
            log.debug("volumedetect skipped for {}: {}", input, e.toString());
            return probe;
        }
    }

    public AudioMasteringProfile selectProfile(AudioAnalysisSnapshot snapshot) {
        if (!snapshot.hasAudioStream()) {
            return AudioMasteringProfile.DEFAULT;
        }
        if (snapshot.likelyNoisy()) {
            return AudioMasteringProfile.SPEECH;
        }
        if (snapshot.channels() <= 1) {
            return AudioMasteringProfile.SPEECH;
        }
        if (snapshot.likelyBassHeavy()) {
            return AudioMasteringProfile.MUSIC;
        }
        if (snapshot.durationSeconds() >= 45
            && snapshot.bitRateBps() >= 160_000
            && snapshot.channels() >= 2) {
            return AudioMasteringProfile.CINEMATIC;
        }
        if (snapshot.bitRateBps() >= 128_000 && snapshot.channels() >= 2) {
            return AudioMasteringProfile.MUSIC;
        }
        return AudioMasteringProfile.DEFAULT;
    }

    private AudioAnalysisSnapshot probeStreams(Path input, Path workDir) {
        Path probeLog = null;
        try {
            probeLog = Files.createTempFile(workDir, "ffprobe-audio-", ".log");
            List<String> cmd = List.of(
                processingProperties.getFfprobePath(),
                "-v",
                "error",
                "-show_entries",
                "format=duration:stream=codec_type,channels,sample_rate,bit_rate",
                "-of",
                "json",
                input.toAbsolutePath().toString()
            );
            runProcess(cmd, probeLog);
            JsonNode root = objectMapper.readTree(Files.readString(probeLog, StandardCharsets.UTF_8));
            double duration = parseDuration(root.path("format"));
            JsonNode streams = root.path("streams");
            if (!streams.isArray()) {
                return AudioAnalysisSnapshot.empty();
            }
            for (JsonNode stream : streams) {
                if (!"audio".equalsIgnoreCase(stream.path("codec_type").asText(""))) {
                    continue;
                }
                int channels = stream.path("channels").asInt(2);
                int sampleRate = stream.path("sample_rate").asInt(44_100);
                long bitRate = parseLong(stream.path("bit_rate").asText("0"));
                return new AudioAnalysisSnapshot(
                    true,
                    channels,
                    sampleRate,
                    bitRate,
                    duration,
                    null,
                    null,
                    false,
                    false
                );
            }
            return AudioAnalysisSnapshot.empty();
        } catch (Exception e) {
            log.warn("ffprobe audio analysis failed for {}: {}", input, e.toString());
            return AudioAnalysisSnapshot.empty();
        } finally {
            if (probeLog != null) {
                try {
                    Files.deleteIfExists(probeLog);
                } catch (IOException ignored) {
                    // best-effort
                }
            }
        }
    }

    private VolumeStats runVolumeDetect(Path input, Path workDir) throws Exception {
        Path logFile = Files.createTempFile(workDir, "volumedetect-", ".log");
        try {
            List<String> cmd = List.of(
                processingProperties.getFfmpegPath(),
                "-hide_banner",
                "-nostats",
                "-i",
                input.toAbsolutePath().toString(),
                "-af",
                "volumedetect",
                "-f",
                "null",
                "-"
            );
            runProcess(cmd, logFile);
            String text = Files.readString(logFile, StandardCharsets.UTF_8);
            return new VolumeStats(parseVolume(MEAN_VOLUME, text), parseVolume(MAX_VOLUME, text));
        } finally {
            Files.deleteIfExists(logFile);
        }
    }

    private static Double parseVolume(Pattern pattern, String text) {
        Matcher m = pattern.matcher(text);
        if (!m.find()) {
            return null;
        }
        try {
            return Double.parseDouble(m.group(1));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static boolean classifyNoisy(VolumeStats stats) {
        if (stats.meanDb == null || stats.maxDb == null) {
            return false;
        }
        return stats.maxDb - stats.meanDb > 18 || stats.meanDb > -14;
    }

    private static boolean classifyBassHeavy(VolumeStats stats, AudioAnalysisSnapshot probe) {
        if (stats.meanDb == null) {
            return probe.bitRateBps() >= 192_000;
        }
        return stats.meanDb > -16 && probe.bitRateBps() >= 160_000;
    }

    private static double parseDuration(JsonNode format) {
        String raw = format.path("duration").asText("0").trim();
        try {
            return Double.parseDouble(raw);
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private static long parseLong(String raw) {
        try {
            return Long.parseLong(raw.trim());
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private void runProcess(List<String> command, Path logFile) throws Exception {
        ProcessBuilder pb = new ProcessBuilder(command);
        pb.redirectErrorStream(true);
        pb.redirectOutput(ProcessBuilder.Redirect.to(logFile.toFile()));
        Process p = pb.start();
        boolean finished = p.waitFor(3, TimeUnit.MINUTES);
        if (!finished) {
            p.destroyForcibly();
            throw new IllegalStateException("audio probe timeout: " + command);
        }
        if (p.exitValue() != 0) {
            String err = Files.readString(logFile, StandardCharsets.UTF_8);
            int len = Math.min(err.length(), 2000);
            throw new IllegalStateException(
                "audio probe failed (exit " + p.exitValue() + "): " + err.substring(0, len)
            );
        }
    }

    private record VolumeStats(Double meanDb, Double maxDb) {}
}
