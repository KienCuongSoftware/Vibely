package com.vibely.backend.processing;

import com.vibely.backend.storage.ResolvedS3Object;
import com.vibely.backend.storage.S3ObjectUrlBuilder;
import com.vibely.backend.storage.S3Properties;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
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

    public FfmpegHlsPipelineRunner(
        S3Client s3Client,
        S3Properties s3Properties,
        S3ObjectUrlBuilder objectUrlBuilder,
        ProcessingProperties processingProperties,
        VideoProcessingStateService stateService
    ) {
        this.s3Client = s3Client;
        this.s3Properties = s3Properties;
        this.objectUrlBuilder = objectUrlBuilder;
        this.processingProperties = processingProperties;
        this.stateService = stateService;
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

            Integer durationSeconds = probeDurationSeconds(sourceFile);

            String thumbnailUrl = item.existingThumbnailUrl();
            if (thumbnailUrl == null || thumbnailUrl.isBlank()) {
                Path thumbFile = workRoot.resolve("poster.jpg");
                extractThumbnail(sourceFile, thumbFile);
                String thumbKey = "thumbnails/" + item.authorId() + "/" + UUID.randomUUID() + ".jpg";
                uploadObject(thumbKey, thumbFile, "image/jpeg");
                thumbnailUrl = objectUrlBuilder.toPublicHttpsUrl(thumbKey);
            }

            Path transcodeDir = Files.createDirectories(workRoot.resolve("hls"));
            transcodeToHls(sourceFile, transcodeDir);

            String prefix = "hls/" + item.authorId() + "/" + item.videoId() + "/";
            try (Stream<Path> paths = Files.walk(transcodeDir)) {
                for (Path p : paths.filter(Files::isRegularFile).toList()) {
                    String relative = transcodeDir.relativize(p).toString().replace('\\', '/');
                    String destKey = prefix + relative;
                    uploadObject(destKey, p, contentTypeForFileName(relative));
                }
            }

            String masterKey = prefix + "playlist.m3u8";
            String masterUrl = objectUrlBuilder.toPublicHttpsUrl(masterKey);
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
                thumbnailUrl
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

    private Integer probeDurationSeconds(Path input) throws Exception {
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
        Process p = startProcessOrExplain(pb, processingProperties.getFfprobePath());
        boolean finished = p.waitFor(5, TimeUnit.MINUTES);
        if (!finished) {
            p.destroyForcibly();
            throw new IllegalStateException("ffprobe timeout");
        }
        if (p.exitValue() != 0) {
            throw new IllegalStateException("ffprobe exited with " + p.exitValue());
        }
        String line;
        try (BufferedReader r = new BufferedReader(new InputStreamReader(p.getInputStream(), StandardCharsets.UTF_8))) {
            line = r.readLine();
        }
        if (line == null || line.isBlank()) {
            return null;
        }
        double seconds = Double.parseDouble(line.trim());
        return (int) Math.round(seconds);
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

    private void transcodeToHls(Path input, Path outDir) throws Exception {
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
        cmd.add("-c:a");
        cmd.add("aac");
        cmd.add("-b:a");
        cmd.add("128k");
        cmd.add("-hls_time");
        cmd.add("6");
        cmd.add("-hls_playlist_type");
        cmd.add("vod");
        cmd.add("-hls_segment_filename");
        cmd.add("segment_%03d.ts");
        cmd.add("playlist.m3u8");
        runProcess(cmd, outDir);
    }

    private void runProcess(List<String> command, Path workingDir) throws Exception {
        ProcessBuilder pb = new ProcessBuilder(command);
        pb.directory(workingDir.toFile());
        pb.redirectErrorStream(true);
        String exec = command.isEmpty() ? "ffmpeg" : command.get(0);
        Process p = startProcessOrExplain(pb, exec);
        boolean finished = p.waitFor(2, TimeUnit.HOURS);
        if (!finished) {
            p.destroyForcibly();
            throw new IllegalStateException("ffmpeg timeout: " + command);
        }
        if (p.exitValue() != 0) {
            String err = readAll(p);
            throw new IllegalStateException("ffmpeg failed (exit " + p.exitValue() + "): " + err);
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

    private static String readAll(Process p) throws Exception {
        try (BufferedReader r = new BufferedReader(new InputStreamReader(p.getInputStream(), StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = r.readLine()) != null) {
                if (sb.length() > 4000) {
                    break;
                }
                sb.append(line).append('\n');
            }
            return sb.toString();
        }
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
