package com.vibely.backend.processing;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vibely.backend.processing.audio.AudioEnhancementService;
import com.vibely.backend.processing.audio.AudioProcessingResult;
import com.vibely.backend.storage.ResolvedS3Object;
import com.vibely.backend.storage.S3ObjectUrlBuilder;
import com.vibely.backend.storage.S3Properties;
import java.io.IOException;
import java.io.RandomAccessFile;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.stream.Stream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.core.sync.ResponseTransformer;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;

/**
 * Downloads the raw upload from S3, runs FFmpeg (metadata, optional thumbnail, HLS), uploads outputs back to S3.
 * <p>
 * Intended to run outside a DB transaction; persistence is delegated to {@link VideoProcessingStateService}.
 */
@Component
@ConditionalOnProperty(prefix = "app.s3", name = "enabled", havingValue = "true")
public class FfmpegHlsPipelineRunner {

    private static final Logger log = LoggerFactory.getLogger(FfmpegHlsPipelineRunner.class);

    private final S3Client s3Client;
    private final S3Properties s3Properties;
    private final S3ObjectUrlBuilder objectUrlBuilder;
    private final ProcessingProperties processingProperties;
    private final VideoProcessingStateService stateService;
    private final ObjectMapper objectMapper;
    private final AudioEnhancementService audioEnhancementService;

    public FfmpegHlsPipelineRunner(
        S3Client s3Client,
        S3Properties s3Properties,
        S3ObjectUrlBuilder objectUrlBuilder,
        ProcessingProperties processingProperties,
        VideoProcessingStateService stateService,
        ObjectMapper objectMapper,
        AudioEnhancementService audioEnhancementService
    ) {
        this.s3Client = s3Client;
        this.s3Properties = s3Properties;
        this.objectUrlBuilder = objectUrlBuilder;
        this.processingProperties = processingProperties;
        this.stateService = stateService;
        this.objectMapper = objectMapper;
        this.audioEnhancementService = audioEnhancementService;
    }

    public void run(VideoPipelineWorkItem item) {
        try {
            runInternal(item);
        } catch (Exception e) {
            if (isS3ObjectNotFound(e)) {
                log.warn("Video pipeline: S3 object not found for videoId={}", item.videoId(), e);
                stateService.markTerminalFailure(
                    item.jobId(),
                    item.videoId(),
                    "File gốc không tồn tại trên S3 (NoSuchKey/404). "
                        + "Kiểm tra trong console S3 đúng bucket và key (xem log HLS pipeline download). "
                        + "Thường gặp khi PUT presign chưa thành công đã tạo video, object bị xóa, hoặc bucket/URL lệch."
                );
                return;
            }
            log.warn("Video pipeline failed for videoId={}", item.videoId(), e);
            stateService.markFailure(
                item.jobId(),
                item.videoId(),
                e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName(),
                processingProperties.getMaxJobAttempts()
            );
        }
    }

    private static boolean isS3ObjectNotFound(Throwable t) {
        Throwable cur = t;
        while (cur != null) {
            if (cur instanceof NoSuchKeyException) {
                return true;
            }
            if (cur instanceof S3Exception s3 && s3.statusCode() == 404) {
                return true;
            }
            cur = cur.getCause();
        }
        return false;
    }

    private void runInternal(VideoPipelineWorkItem item) throws Exception {
        log.info("HLS pipeline start videoId={} rawUrl={}", item.videoId(), item.rawVideoUrl());
        ResolvedS3Object source = objectUrlBuilder
            .resolveObjectFromUrl(item.rawVideoUrl())
            .orElseThrow(() -> new IllegalArgumentException("URL không map được sang object S3: " + item.rawVideoUrl()));
        log.info("HLS pipeline download bucket={} key={}", source.bucket(), source.key());

        Path workRoot = Files.createTempDirectory("vibely-hls-" + item.videoId() + "-");
        try {
            Path sourceFile = workRoot.resolve("source" + extensionFromKey(source.key()));
            downloadObject(source.bucket(), source.key(), sourceFile);
            log.info("HLS pipeline downloaded local file sizeBytes={}", Files.size(sourceFile));

            Integer durationSeconds = probeDurationSeconds(sourceFile, workRoot);
            log.info("HLS pipeline ffprobe durationSeconds={}", durationSeconds);
            SourceDimensions dims = probeSourceVideoDimensions(sourceFile, workRoot);
            log.info("HLS pipeline ffprobe source dimensions width={} height={}", dims.widthPx(), dims.heightPx());

            String thumbnailUrl = item.existingThumbnailUrl();
            if (thumbnailUrl == null || thumbnailUrl.isBlank()) {
                Path thumbFile = workRoot.resolve("poster.jpg");
                extractThumbnail(sourceFile, thumbFile);
                String thumbKey = "thumbnails/" + item.authorId() + "/" + UUID.randomUUID() + ".jpg";
                uploadObject(thumbKey, thumbFile, "image/jpeg");
                thumbnailUrl = objectUrlBuilder.toPublicHttpsUrl(thumbKey);
            }

            Path transcodeDir = Files.createDirectories(workRoot.resolve("hls"));
            AudioProcessingResult audioPlan = audioEnhancementService.planEnhancement(sourceFile, workRoot);
            log.info(
                "HLS pipeline audio plan videoId={} profile={} enhanced={} notes={}",
                item.videoId(),
                audioPlan.profile(),
                audioPlan.enhancementApplied(),
                audioPlan.notes()
            );
            log.info("HLS pipeline ffmpeg transcode starting videoId={}", item.videoId());
            long transcodeStarted = System.nanoTime();
            transcodeToHls(sourceFile, transcodeDir, audioPlan);
            long transcodeMs = (System.nanoTime() - transcodeStarted) / 1_000_000;
            log.info(
                "HLS pipeline ffmpeg transcode finished videoId={} durationMs={} audioBitrate={}",
                item.videoId(),
                transcodeMs,
                audioPlan.audioBitrateArg()
            );

            String prefix = "hls/" + item.authorId() + "/" + item.videoId() + "/";
            int uploaded = 0;
            try (Stream<Path> paths = Files.walk(transcodeDir)) {
                for (Path p : paths.filter(Files::isRegularFile).toList()) {
                    String relative = transcodeDir.relativize(p).toString().replace('\\', '/');
                    String destKey = prefix + relative;
                    uploadObject(destKey, p, contentTypeForFileName(relative));
                    uploaded++;
                }
            }
            String masterKey = prefix + "playlist.m3u8";
            String masterUrl = objectUrlBuilder.toPublicHttpsUrl(masterKey);
            log.info(
                "HLS uploaded {} object(s). Bucket={}, prefix={} (NOT under uploads/; in S3 console open folder hls then authorId then videoId). masterUrl={}",
                uploaded,
                s3Properties.getBucket(),
                prefix,
                masterUrl
            );
            log.info(
                "HLS pipeline done videoId={} masterKey={} durationSeconds={}",
                item.videoId(),
                masterKey,
                durationSeconds
            );
            stateService.markReadyWithArtifacts(
                item.jobId(),
                item.videoId(),
                masterUrl,
                durationSeconds,
                thumbnailUrl,
                dims.widthPx(),
                dims.heightPx()
            );
        } finally {
            deleteRecursively(workRoot);
        }
    }

    private void downloadObject(String bucket, String key, Path dest) {
        s3Client.getObject(
            GetObjectRequest.builder().bucket(bucket).key(key).build(),
            ResponseTransformer.toFile(dest)
        );
    }

    private void uploadObject(String key, Path file, String contentType) {
        PutObjectRequest put = PutObjectRequest.builder()
            .bucket(s3Properties.getBucket())
            .key(key)
            .contentType(contentType)
            .build();
        s3Client.putObject(put, RequestBody.fromFile(file));
    }

    /**
     * Writes ffprobe stdout+stderr to a file so the subprocess never blocks on a full pipe
     * (same class of deadlock as long-running ffmpeg when using {@link ProcessBuilder.Redirect#PIPE}).
     */
    private Integer probeDurationSeconds(Path input, Path workRoot) throws Exception {
        Path probeLog = Files.createTempFile(workRoot, "ffprobe-", ".log");
        try {
            List<String> cmd = List.of(
                processingProperties.getFfprobePath(),
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "default=noprint_wrappers=1:nokey=1",
                input.toAbsolutePath().toString()
            );
            ProcessBuilder pb = new ProcessBuilder(cmd);
            pb.redirectErrorStream(true);
            pb.redirectOutput(ProcessBuilder.Redirect.to(probeLog.toFile()));
            Process p = startProcessOrExplain(pb, processingProperties.getFfprobePath());
            boolean finished = p.waitFor(5, TimeUnit.MINUTES);
            if (!finished) {
                p.destroyForcibly();
                throw new IllegalStateException("ffprobe timeout");
            }
            if (p.exitValue() != 0) {
                throw new IllegalStateException(
                    "ffprobe exited with " + p.exitValue() + ": " + tailOfFile(probeLog, 4000)
                );
            }
            String raw = Files.readString(probeLog, StandardCharsets.UTF_8).trim();
            if (raw.isBlank()) {
                return null;
            }
            String[] lines = raw.split("\\R");
            for (int i = lines.length - 1; i >= 0; i--) {
                String candidate = lines[i].trim();
                if (candidate.isEmpty()) {
                    continue;
                }
                try {
                    double seconds = Double.parseDouble(candidate);
                    return (int) Math.round(seconds);
                } catch (NumberFormatException ignored) {
                    // keep scanning (stderr may precede duration line when merged)
                }
            }
            return null;
        } finally {
            Files.deleteIfExists(probeLog);
        }
    }

    private record SourceDimensions(Integer widthPx, Integer heightPx) {}

    /**
     * Kích thước stream video đầu tiên; tag {@code rotate} 90°/270° (hoặc -90°) → đổi chỗ w/h theo hướng hiển thị.
     * Lỗi ffprobe không làm fail pipeline.
     */
    private SourceDimensions probeSourceVideoDimensions(Path input, Path workRoot) {
        Path probeLog = null;
        try {
            probeLog = Files.createTempFile(workRoot, "ffprobe-dim-", ".json");
            List<String> cmd = List.of(
                processingProperties.getFfprobePath(),
                "-v",
                "error",
                "-select_streams",
                "v:0",
                "-show_entries",
                "stream=width,height",
                "-show_entries",
                "stream_tags=rotate",
                "-of",
                "json",
                input.toAbsolutePath().toString()
            );
            ProcessBuilder pb = new ProcessBuilder(cmd);
            pb.redirectErrorStream(true);
            pb.redirectOutput(ProcessBuilder.Redirect.to(probeLog.toFile()));
            Process p = startProcessOrExplain(pb, processingProperties.getFfprobePath());
            boolean finished = p.waitFor(5, TimeUnit.MINUTES);
            if (!finished) {
                p.destroyForcibly();
                log.warn("ffprobe dimensions timeout for {}", input);
                return new SourceDimensions(null, null);
            }
            if (p.exitValue() != 0) {
                log.warn(
                    "ffprobe dimensions exit {} for {}: {}",
                    p.exitValue(),
                    input,
                    tailOfFile(probeLog, 2000)
                );
                return new SourceDimensions(null, null);
            }
            String json = Files.readString(probeLog, StandardCharsets.UTF_8).trim();
            if (json.isBlank()) {
                return new SourceDimensions(null, null);
            }
            JsonNode root = objectMapper.readTree(json);
            JsonNode streams = root.get("streams");
            if (streams == null || !streams.isArray() || streams.isEmpty()) {
                return new SourceDimensions(null, null);
            }
            JsonNode s0 = streams.get(0);
            int w = s0.path("width").asInt(0);
            int h = s0.path("height").asInt(0);
            if (w <= 0 || h <= 0) {
                return new SourceDimensions(null, null);
            }
            Integer rot = parseRotateTag(s0.get("tags"));
            boolean swap = rot != null && (rot == 90 || rot == 270 || rot == -90);
            int outW = swap ? h : w;
            int outH = swap ? w : h;
            return new SourceDimensions(outW, outH);
        } catch (Exception e) {
            log.warn("ffprobe dimensions failed for {}: {}", input, e.toString());
            return new SourceDimensions(null, null);
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

    private static Integer parseRotateTag(JsonNode tags) {
        if (tags == null || tags.isNull() || !tags.has("rotate")) {
            return null;
        }
        JsonNode n = tags.get("rotate");
        if (n.isIntegralNumber()) {
            return n.intValue();
        }
        String s = n.asText("").trim();
        if (s.isEmpty()) {
            return null;
        }
        try {
            double d = Double.parseDouble(s);
            return (int) Math.round(d);
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private void extractThumbnail(Path input, Path output) throws Exception {
        List<String> cmd = List.of(
            processingProperties.getFfmpegPath(),
            "-y",
            "-ss",
            "00:00:01",
            "-i",
            input.toAbsolutePath().toString(),
            "-frames:v",
            "1",
            "-q:v",
            "2",
            output.toAbsolutePath().toString()
        );
        runProcess(cmd, input.getParent());
    }

    private void transcodeToHls(Path input, Path outDir, AudioProcessingResult audioPlan) throws Exception {
        List<String> cmd = new ArrayList<>();
        cmd.add(processingProperties.getFfmpegPath());
        cmd.add("-y");
        cmd.add("-i");
        cmd.add(input.toAbsolutePath().toString());
        cmd.add("-c:v");
        cmd.add("libx264");
        cmd.add("-preset");
        cmd.add("veryfast");
        cmd.add("-crf");
        cmd.add("23");
        if (audioPlan.hasAudioStream()) {
            if (audioPlan.hasAudioFilter()) {
                cmd.add("-af");
                cmd.add(audioPlan.filterChain());
            }
            cmd.add("-c:a");
            cmd.add("aac");
            cmd.add("-b:a");
            cmd.add(audioPlan.audioBitrateArg());
            cmd.add("-ar");
            cmd.add(String.valueOf(audioPlan.sampleRateHz()));
        } else {
            cmd.add("-an");
        }
        cmd.add("-hls_time");
        cmd.add("6");
        cmd.add("-hls_playlist_type");
        cmd.add("vod");
        cmd.add("-hls_segment_filename");
        cmd.add("segment_%03d.ts");
        cmd.add("-f");
        cmd.add("hls");
        cmd.add("playlist.m3u8");
        runProcess(cmd, outDir);
    }

    /**
     * Runs ffmpeg with merged stderr redirected to a file. Waiting on {@code waitFor()} without draining
     * a PIPE causes a classic deadlock: ffmpeg fills the pipe buffer with progress logs and blocks forever.
     */
    private void runProcess(List<String> command, Path workingDir) throws Exception {
        Path logFile = Files.createTempFile(workingDir, "ffmpeg-", ".log");
        ProcessBuilder pb = new ProcessBuilder(command);
        pb.directory(workingDir.toFile());
        pb.redirectErrorStream(true);
        pb.redirectOutput(ProcessBuilder.Redirect.to(logFile.toFile()));
        String exec = command.isEmpty() ? "ffmpeg" : command.get(0);
        Process p = startProcessOrExplain(pb, exec);
        try {
            boolean finished = p.waitFor(2, TimeUnit.HOURS);
            if (!finished) {
                p.destroyForcibly();
                throw new IllegalStateException("ffmpeg timeout: " + command);
            }
            if (p.exitValue() != 0) {
                String err = tailOfFile(logFile, 4000);
                throw new IllegalStateException("ffmpeg failed (exit " + p.exitValue() + "): " + err);
            }
        } finally {
            Files.deleteIfExists(logFile);
        }
    }

    private Process startProcessOrExplain(ProcessBuilder pb, String configuredExecutable) throws IOException {
        try {
            return pb.start();
        } catch (IOException e) {
            String msg = ffmpegStartFailureMessage(configuredExecutable, e);
            throw new IOException(msg, e);
        }
    }

    private static String ffmpegStartFailureMessage(String configuredExecutable, IOException cause) {
        String os = System.getProperty("os.name", "");
        boolean windows = os.toLowerCase(Locale.ROOT).contains("win");
        StringBuilder sb = new StringBuilder();
        sb.append("Khong chay duoc tien trinh \"")
            .append(configuredExecutable)
            .append("\" (")
            .append(cause.getMessage())
            .append("). ");
        if (windows) {
            sb.append(
                "Tren Windows hay dat bien FFMPEG_PATH / FFPROBE_PATH tro toi file .exe day du "
                    + "(vd C:/ffmpeg/bin/ffprobe.exe) hoac them thu muc bin cua FFmpeg vao PATH cua tien trinh Java (IDE/terminal chay mvn spring-boot:run). "
            );
        } else {
            sb.append("Cai FFmpeg hoac dat FFMPEG_PATH / FFPROBE_PATH tro toi ffmpeg/ffprobe. ");
        }
        sb.append("Sau khi sua, pipeline se tao thu muc hls/ tren S3; uploads/ chi giu 1 file mp4 goc la dung.");
        return sb.toString();
    }

    private static String tailOfFile(Path logFile, int maxChars) throws IOException {
        if (!Files.exists(logFile)) {
            return "";
        }
        long len = Files.size(logFile);
        if (len == 0) {
            return "";
        }
        int toRead = (int) Math.min(len, maxChars);
        byte[] buf = new byte[toRead];
        try (RandomAccessFile raf = new RandomAccessFile(logFile.toFile(), "r")) {
            raf.seek(len - toRead);
            raf.readFully(buf);
        }
        return new String(buf, StandardCharsets.UTF_8);
    }

    private static String extensionFromKey(String key) {
        int dot = key.lastIndexOf('.');
        if (dot < 0) {
            return ".mp4";
        }
        return key.substring(dot).toLowerCase(Locale.ROOT);
    }

    private static String contentTypeForFileName(String name) {
        String lower = name.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".m3u8")) {
            return "application/vnd.apple.mpegurl";
        }
        if (lower.endsWith(".ts")) {
            return "video/mp2t";
        }
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
            return "image/jpeg";
        }
        return "application/octet-stream";
    }

    private static void deleteRecursively(Path root) {
        try {
            if (!Files.exists(root)) {
                return;
            }
            try (Stream<Path> walk = Files.walk(root)) {
                walk.sorted((a, b) -> b.getNameCount() - a.getNameCount()).forEach((p) -> {
                    try {
                        Files.deleteIfExists(p);
                    } catch (Exception ignored) {
                        // best-effort cleanup
                    }
                });
            }
        } catch (Exception ignored) {
            // best-effort cleanup
        }
    }
}
