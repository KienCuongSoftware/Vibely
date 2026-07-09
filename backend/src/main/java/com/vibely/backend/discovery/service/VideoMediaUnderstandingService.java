package com.vibely.backend.discovery.service;

import com.vibely.backend.discovery.config.DiscoveryProperties;
import com.vibely.backend.discovery.dto.VideoMediaSignals;
import com.vibely.backend.discovery.openai.OpenAiHttpClient;
import com.vibely.backend.processing.ProcessingProperties;
import com.vibely.backend.storage.ResolvedS3Object;
import com.vibely.backend.storage.S3ObjectUrlBuilder;
import com.vibely.backend.storage.S3Properties;
import com.vibely.backend.video.Video;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.sync.ResponseTransformer;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;

@Service
public class VideoMediaUnderstandingService {
    private static final Logger log = LoggerFactory.getLogger(VideoMediaUnderstandingService.class);

    private final DiscoveryProperties discoveryProperties;
    private final ProcessingProperties processingProperties;
    private final S3Properties s3Properties;
    private final S3ObjectUrlBuilder objectUrlBuilder;
    private final ObjectProvider<S3Client> s3ClientProvider;
    private final OpenAiHttpClient openAiHttpClient;

    public VideoMediaUnderstandingService(
        DiscoveryProperties discoveryProperties,
        ProcessingProperties processingProperties,
        S3Properties s3Properties,
        S3ObjectUrlBuilder objectUrlBuilder,
        ObjectProvider<S3Client> s3ClientProvider,
        OpenAiHttpClient openAiHttpClient
    ) {
        this.discoveryProperties = discoveryProperties;
        this.processingProperties = processingProperties;
        this.s3Properties = s3Properties;
        this.objectUrlBuilder = objectUrlBuilder;
        this.s3ClientProvider = s3ClientProvider;
        this.openAiHttpClient = openAiHttpClient;
    }

    public VideoMediaSignals extractSignals(Video video) {
        if (!discoveryProperties.isMediaUnderstandingReady() || video == null) {
            return VideoMediaSignals.empty();
        }
        S3Client s3Client = s3ClientProvider.getIfAvailable();
        if (s3Client == null || !s3Properties.isEnabled()) {
            return VideoMediaSignals.empty();
        }
        ResolvedS3Object source = objectUrlBuilder.resolveObjectFromUrl(video.getVideoUrl()).orElse(null);
        if (source == null) {
            return VideoMediaSignals.empty();
        }

        Path workRoot = null;
        try {
            workRoot = Files.createTempDirectory("vibely-media-" + video.getId() + "-");
            Path sourceFile = workRoot.resolve("source.mp4");
            downloadObject(s3Client, source.bucket(), source.key(), sourceFile);
            long bytes = Files.size(sourceFile);
            if (bytes <= 0 || bytes > discoveryProperties.getMediaMaxBytes()) {
                log.debug("Skip media understanding for video {} sizeBytes={}", video.getId(), bytes);
                return VideoMediaSignals.empty();
            }

            String transcript = transcribe(sourceFile, workRoot);
            String ocrText = extractOcr(sourceFile, workRoot);
            return new VideoMediaSignals(trimTo(transcript, 4000), trimTo(ocrText, 2000));
        } catch (Exception ex) {
            log.warn("Media understanding failed for video {}: {}", video.getId(), ex.getMessage());
            return VideoMediaSignals.empty();
        } finally {
            if (workRoot != null) {
                deleteQuietly(workRoot);
            }
        }
    }

    private String transcribe(Path sourceFile, Path workRoot) throws Exception {
        Path audioFile = workRoot.resolve("speech.mp3");
        int maxSeconds = Math.max(10, discoveryProperties.getTranscriptMaxSeconds());
        List<String> cmd = List.of(
            processingProperties.getFfmpegPath(),
            "-hide_banner",
            "-loglevel", "error",
            "-y",
            "-i", sourceFile.toAbsolutePath().toString(),
            "-t", String.valueOf(maxSeconds),
            "-vn",
            "-ac", "1",
            "-ar", "16000",
            "-b:a", "64k",
            audioFile.toAbsolutePath().toString()
        );
        runProcess(cmd, 90);
        if (!Files.isRegularFile(audioFile) || Files.size(audioFile) < 512) {
            return "";
        }
        return openAiHttpClient.transcribeAudio(audioFile);
    }

    private String extractOcr(Path sourceFile, Path workRoot) throws Exception {
        int frameCount = Math.max(1, Math.min(5, discoveryProperties.getOcrFrameCount()));
        Double duration = probeDurationSeconds(sourceFile, workRoot);
        List<Path> frames = new ArrayList<>();
        for (int index = 0; index < frameCount; index++) {
            double seek = duration == null || duration <= 1.0
                ? index * 2.0
                : duration * ((index + 1.0) / (frameCount + 1.0));
            Path frame = workRoot.resolve("frame-" + index + ".jpg");
            List<String> cmd = List.of(
                processingProperties.getFfmpegPath(),
                "-hide_banner",
                "-loglevel", "error",
                "-y",
                "-ss", String.format(Locale.US, "%.2f", seek),
                "-i", sourceFile.toAbsolutePath().toString(),
                "-frames:v", "1",
                "-q:v", "3",
                frame.toAbsolutePath().toString()
            );
            runProcess(cmd, 45);
            if (Files.isRegularFile(frame) && Files.size(frame) > 0) {
                frames.add(frame);
            }
        }
        if (frames.isEmpty()) {
            return "";
        }
        return openAiHttpClient.extractVisibleTextFromImages(frames);
    }

    private Double probeDurationSeconds(Path input, Path workRoot) {
        try {
            Path probeLog = Files.createTempFile(workRoot, "ffprobe-", ".log");
            List<String> cmd = List.of(
                processingProperties.getFfprobePath(),
                "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                input.toAbsolutePath().toString()
            );
            runProcessToFile(cmd, probeLog, 30);
            String raw = Files.readString(probeLog, StandardCharsets.UTF_8).trim();
            if (raw.isBlank()) {
                return null;
            }
            return Double.parseDouble(raw.split("\\R")[0].trim());
        } catch (Exception ex) {
            return null;
        }
    }

    private void downloadObject(S3Client s3Client, String bucket, String key, Path dest) {
        GetObjectRequest req = GetObjectRequest.builder().bucket(bucket).key(key).build();
        s3Client.getObject(req, ResponseTransformer.toFile(dest));
    }

    private void runProcess(List<String> cmd, int timeoutSeconds) throws Exception {
        Path logFile = Files.createTempFile("vibely-ffmpeg-", ".log");
        try {
            runProcessToFile(cmd, logFile, timeoutSeconds);
        } finally {
            deleteQuietly(logFile);
        }
    }

    private void runProcessToFile(List<String> cmd, Path logFile, int timeoutSeconds) throws Exception {
        ProcessBuilder pb = new ProcessBuilder(cmd);
        pb.redirectErrorStream(true);
        pb.redirectOutput(ProcessBuilder.Redirect.to(logFile.toFile()));
        Process process = pb.start();
        boolean finished = process.waitFor(timeoutSeconds, TimeUnit.SECONDS);
        if (!finished) {
            process.destroyForcibly();
            throw new IllegalStateException("ffmpeg timeout");
        }
        if (process.exitValue() != 0) {
            String err = Files.exists(logFile) ? Files.readString(logFile, StandardCharsets.UTF_8) : "";
            throw new IllegalStateException("ffmpeg failed: " + trimTo(err, 500));
        }
    }

    private static String trimTo(String value, int max) {
        if (value == null) {
            return "";
        }
        String trimmed = value.trim();
        return trimmed.length() <= max ? trimmed : trimmed.substring(0, max);
    }

    private static void deleteQuietly(Path path) {
        try {
            if (path == null || !Files.exists(path)) {
                return;
            }
            if (Files.isDirectory(path)) {
                try (var stream = Files.walk(path)) {
                    stream.sorted((a, b) -> b.compareTo(a)).forEach(p -> {
                        try {
                            Files.deleteIfExists(p);
                        } catch (Exception ignored) {
                            // ignore
                        }
                    });
                }
            } else {
                Files.deleteIfExists(path);
            }
        } catch (Exception ignored) {
            // ignore
        }
    }
}
