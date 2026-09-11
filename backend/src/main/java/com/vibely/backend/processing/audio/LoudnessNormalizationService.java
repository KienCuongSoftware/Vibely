package com.vibely.backend.processing.audio;

import com.vibely.backend.processing.ProcessingProperties;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Target loudness for streaming UGC (mobile-first, punchy but not clipped).
 */
@Component
public class LoudnessNormalizationService {

    private static final Logger log = LoggerFactory.getLogger(LoudnessNormalizationService.class);

    private static final Pattern JSON_BLOCK = Pattern.compile("\\{[^{}]*\"input_i\"[^{}]*\\}", Pattern.DOTALL);

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
     * Single-pass {@code loudnorm} (fallback when measure pass fails).
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

    /**
     * Two-pass linear {@code loudnorm} using measured stats from {@link #measure}.
     */
    public String loudnormFilterSegment(LoudnormMeasurement measured) {
        ProcessingProperties.Audio audio = processingProperties.getAudio();
        return String.format(
            Locale.US,
            "loudnorm=I=%.1f:LRA=%.1f:TP=%.1f:measured_I=%.2f:measured_LRA=%.2f:measured_TP=%.2f"
                + ":measured_thresh=%.2f:offset=%.2f:linear=true",
            audio.getIntegratedLoudnessLufs(),
            audio.getLoudnessRange(),
            audio.getTruePeakDb(),
            measured.inputI(),
            measured.inputLra(),
            measured.inputTp(),
            measured.inputThresh(),
            measured.targetOffset()
        );
    }

    /**
     * First loudnorm pass over {@code preLoudnormChain} to capture measured values.
     * Fail-open: empty optional keeps single-pass loudnorm.
     */
    public Optional<LoudnormMeasurement> measure(Path input, Path workDir, String preLoudnormChain) {
        Path logFile = null;
        try {
            logFile = Files.createTempFile(workDir, "loudnorm-measure-", ".log");
            ProcessingProperties.Audio audio = processingProperties.getAudio();
            String measureAf = preLoudnormChain
                + ","
                + String.format(
                    Locale.US,
                    "loudnorm=I=%.1f:LRA=%.1f:TP=%.1f:print_format=json",
                    audio.getIntegratedLoudnessLufs(),
                    audio.getLoudnessRange(),
                    audio.getTruePeakDb()
                );
            List<String> cmd = List.of(
                processingProperties.getFfmpegPath(),
                "-hide_banner",
                "-nostats",
                "-i",
                input.toAbsolutePath().toString(),
                "-af",
                measureAf,
                "-f",
                "null",
                "-"
            );
            runProcess(cmd, logFile);
            String text = Files.readString(logFile, StandardCharsets.UTF_8);
            return parseMeasurement(text);
        } catch (Exception e) {
            log.debug("loudnorm measure skipped for {}: {}", input, e.toString());
            return Optional.empty();
        } finally {
            if (logFile != null) {
                try {
                    Files.deleteIfExists(logFile);
                } catch (IOException ignored) {
                    // best-effort
                }
            }
        }
    }

    static Optional<LoudnormMeasurement> parseMeasurement(String ffmpegLog) {
        Matcher matcher = JSON_BLOCK.matcher(ffmpegLog);
        if (!matcher.find()) {
            return Optional.empty();
        }
        String json = matcher.group();
        Double inputI = readJsonNumber(json, "input_i");
        Double inputTp = readJsonNumber(json, "input_tp");
        Double inputLra = readJsonNumber(json, "input_lra");
        Double inputThresh = readJsonNumber(json, "input_thresh");
        Double offset = readJsonNumber(json, "target_offset");
        if (inputI == null || inputTp == null || inputLra == null || inputThresh == null || offset == null) {
            return Optional.empty();
        }
        return Optional.of(new LoudnormMeasurement(inputI, inputTp, inputLra, inputThresh, offset));
    }

    private static Double readJsonNumber(String json, String key) {
        Pattern p = Pattern.compile("\"" + Pattern.quote(key) + "\"\\s*:\\s*\"?(-?\\d+(?:\\.\\d+)?)\"?");
        Matcher m = p.matcher(json);
        if (!m.find()) {
            return null;
        }
        try {
            return Double.parseDouble(m.group(1));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private void runProcess(List<String> command, Path logFile) throws Exception {
        ProcessBuilder pb = new ProcessBuilder(command);
        pb.redirectErrorStream(true);
        pb.redirectOutput(ProcessBuilder.Redirect.to(logFile.toFile()));
        Process p = pb.start();
        boolean finished = p.waitFor(5, TimeUnit.MINUTES);
        if (!finished) {
            p.destroyForcibly();
            throw new IllegalStateException("loudnorm measure timeout");
        }
        // loudnorm prints JSON even when exit is 0; treat non-zero as soft failure via empty parse
        if (p.exitValue() != 0) {
            String err = Files.readString(logFile, StandardCharsets.UTF_8);
            int len = Math.min(err.length(), 2000);
            throw new IllegalStateException(
                "loudnorm measure failed (exit " + p.exitValue() + "): " + err.substring(0, len)
            );
        }
    }

    public record LoudnormMeasurement(
        double inputI,
        double inputTp,
        double inputLra,
        double inputThresh,
        double targetOffset
    ) {}
}
