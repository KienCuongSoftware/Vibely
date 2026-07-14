package com.vibely.backend.video.download;

import com.vibely.backend.common.NotFoundException;
import com.vibely.backend.processing.ProcessingProperties;
import com.vibely.backend.processing.WindowsFfmpegPathResolver;
import com.vibely.backend.storage.ResolvedS3Object;
import com.vibely.backend.storage.S3ObjectUrlBuilder;
import com.vibely.backend.storage.S3Properties;
import com.vibely.backend.user.entity.User;
import com.vibely.backend.user.repository.UserRepository;
import com.vibely.backend.video.Video;
import com.vibely.backend.video.VideoRepository;
import com.vibely.backend.video.VideoStatus;
import com.vibely.backend.video.service.VideoPrivacyAccessService;
import java.io.IOException;
import java.io.OutputStream;
import java.io.RandomAccessFile;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.core.sync.ResponseTransformer;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;

/**
 * Renders a downloadable MP4 with Vibely logo + @username watermark (TikTok-style).
 */
@Service
@ConditionalOnProperty(prefix = "app.s3", name = "enabled", havingValue = "true")
public class VideoWatermarkDownloadService {

    private static final Logger log = LoggerFactory.getLogger(VideoWatermarkDownloadService.class);

    private final S3Client s3Client;
    private final S3Properties s3Properties;
    private final S3ObjectUrlBuilder objectUrlBuilder;
    private final ProcessingProperties processingProperties;
    private final VideoRepository videoRepository;
    private final UserRepository userRepository;
    private final VideoPrivacyAccessService privacyAccessService;

    public VideoWatermarkDownloadService(
        S3Client s3Client,
        S3Properties s3Properties,
        S3ObjectUrlBuilder objectUrlBuilder,
        ProcessingProperties processingProperties,
        VideoRepository videoRepository,
        UserRepository userRepository,
        VideoPrivacyAccessService privacyAccessService
    ) {
        this.s3Client = s3Client;
        this.s3Properties = s3Properties;
        this.objectUrlBuilder = objectUrlBuilder;
        this.processingProperties = processingProperties;
        this.videoRepository = videoRepository;
        this.userRepository = userRepository;
        this.privacyAccessService = privacyAccessService;
    }

    public static String cacheKeyFor(UUID publicId) {
        return "downloads/" + publicId + "/watermarked.mp4";
    }

    /**
     * Renders a watermarked MP4 from a local upload file and uploads it to the download cache.
     * Called from the HLS pipeline while the raw file is already on disk.
     */
    public void preRenderAndUploadFromLocal(
        Path sourceFile,
        Path workDir,
        UUID publicId,
        String authorUsername
    ) throws Exception {
        String bucket = s3Properties.getBucket();
        if (bucket == null || bucket.isBlank()) {
            return;
        }
        String cacheKey = cacheKeyFor(publicId);
        if (objectExists(bucket, cacheKey)) {
            log.info("Watermarked download already cached publicId={}", publicId);
            return;
        }
        String username = normalizeUsername(authorUsername);
        Path logoPng = VibelyWatermarkLogo.materializePng(workDir);
        Path output = workDir.resolve("watermarked.mp4");
        transcodeWithWatermark(sourceFile, logoPng, output, username);
        uploadObject(bucket, cacheKey, output);
        log.info("Watermarked download pre-rendered publicId={} author=@{}", publicId, username);
    }

    static String normalizeUsername(String username) {
        String value = username != null ? username.trim().replace("@", "") : "";
        return value.isBlank() ? "vibely" : value;
    }

    /**
     * Returns a cached S3 object when available; otherwise renders once, uploads, then streams locally.
     */
    public WatermarkedDownloadArtifact resolveWatermarkedDownload(UUID publicId, String viewerEmail)
        throws Exception {
        DownloadContext ctx = resolveDownloadContext(publicId, viewerEmail);
        String bucket = s3Properties.getBucket();
        String cacheKey = cacheKeyFor(publicId);
        if (bucket != null && !bucket.isBlank() && objectExists(bucket, cacheKey)) {
            log.info("Watermarked download cache hit publicId={} author=@{}", publicId, ctx.username());
            return new WatermarkedDownloadArtifact(bucket, cacheKey, null, null);
        }

        ResolvedS3Object source = objectUrlBuilder.resolveObjectFromUrl(ctx.rawVideoUrl())
            .orElseThrow(() -> new IllegalStateException("URL video không map được sang S3."));

        Path workRoot = Files.createTempDirectory("vibely-dl-" + publicId + "-");
        try {
            Path sourceFile = workRoot.resolve("source" + extensionFromKey(source.key()));
            downloadObject(source.bucket(), source.key(), sourceFile);
            Path logoPng = VibelyWatermarkLogo.materializePng(workRoot);
            Path output = workRoot.resolve("download.mp4");
            transcodeWithWatermark(sourceFile, logoPng, output, ctx.username());
            if (bucket != null && !bucket.isBlank()) {
                uploadObject(bucket, cacheKey, output);
                log.info(
                    "Watermarked download rendered and cached publicId={} author=@{}",
                    publicId,
                    ctx.username()
                );
                return new WatermarkedDownloadArtifact(bucket, cacheKey, output, workRoot);
            }
            log.info("Watermarked download ready (no S3 cache) publicId={} author=@{}", publicId, ctx.username());
            return new WatermarkedDownloadArtifact(null, null, output, workRoot);
        } catch (Exception e) {
            deleteRecursively(workRoot);
            throw e;
        }
    }

    @Transactional(readOnly = true)
    DownloadContext resolveDownloadContext(UUID publicId, String viewerEmail) {
        Video video = videoRepository.findWithAuthorByPublicId(publicId)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy video"));
        assertViewable(video, viewerEmail);

        String rawUrl = video.getVideoUrl();
        if (rawUrl == null || rawUrl.isBlank()) {
            throw new IllegalStateException("Video chưa có file gốc để tải.");
        }

        User author = video.getAuthor();
        String username = author != null ? normalizeUsername(author.getUsername()) : "vibely";
        return new DownloadContext(rawUrl, username);
    }

    private record DownloadContext(String rawVideoUrl, String username) {}

    private void assertViewable(Video video, String viewerEmail) {
        if (video.getStatus() == VideoStatus.REMOVED) {
            throw new NotFoundException("Không tìm thấy video");
        }
        User viewer = null;
        if (viewerEmail != null && !viewerEmail.isBlank()) {
            viewer = userRepository.findByEmail(viewerEmail.trim()).orElse(null);
        }
        if (video.getStatus() == VideoStatus.READY) {
            if (!privacyAccessService.canViewerWatch(video, viewer)) {
                throw new NotFoundException("Không tìm thấy video");
            }
            return;
        }
        if (viewer == null || !Objects.equals(video.getAuthor().getId(), viewer.getId())) {
            throw new NotFoundException("Không tìm thấy video");
        }
    }

    private void downloadObject(String bucket, String key, Path dest) {
        s3Client.getObject(
            GetObjectRequest.builder().bucket(bucket).key(key).build(),
            ResponseTransformer.toFile(dest)
        );
    }

    private boolean objectExists(String bucket, String key) {
        try {
            s3Client.headObject(HeadObjectRequest.builder().bucket(bucket).key(key).build());
            return true;
        } catch (NoSuchKeyException e) {
            return false;
        } catch (S3Exception e) {
            if (e.statusCode() == 404) {
                return false;
            }
            throw e;
        }
    }

    private void uploadObject(String bucket, String key, Path file) {
        PutObjectRequest put = PutObjectRequest.builder()
            .bucket(bucket)
            .key(key)
            .contentType("video/mp4")
            .build();
        s3Client.putObject(put, RequestBody.fromFile(file));
    }

    public void streamArtifact(WatermarkedDownloadArtifact artifact, OutputStream out) throws IOException {
        if (artifact == null) {
            throw new IllegalArgumentException("artifact is required");
        }
        if (artifact.cachedInS3() && !artifact.hasLocalFile()) {
            s3Client.getObject(
                GetObjectRequest.builder().bucket(artifact.bucket()).key(artifact.key()).build(),
                ResponseTransformer.toOutputStream(out)
            );
            return;
        }
        if (!artifact.hasLocalFile()) {
            throw new IllegalStateException("Không có file video để tải về.");
        }
        Files.copy(artifact.localFile(), out);
    }

    private void transcodeWithWatermark(Path input, Path logoPng, Path output, String username)
        throws Exception {
        WindowsFfmpegPathResolver.applyIfNeeded(processingProperties);
        String fontFile = FfmpegFontResolver.resolveFontFile();
        if (fontFile == null) {
            throw new IllegalStateException(
                "Không tìm thấy font hệ thống cho watermark. Cài font TTF (Segoe UI / Arial)."
            );
        }
        String fontArg = FfmpegFontResolver.ffmpegFontArg(fontFile);
        String handle = "@" + username.replace("@", "");
        String brandText = escapeFfmpegText("Vibely");
        String userText = escapeFfmpegText(handle);

        String filter = String.format(
            Locale.ROOT,
            "[1:v]format=rgba,scale=44:-1[lg];"
                + "[0:v][lg]overlay=24:H-88:format=auto[v0];"
                + "[v0]drawtext=fontfile='%s':text='%s':x=76:y=H-82:fontsize=28:fontcolor=white:borderw=2:bordercolor=black@0.45,"
                + "drawtext=fontfile='%s':text='%s':x=76:y=H-50:fontsize=22:fontcolor=white@0.95:borderw=2:bordercolor=black@0.45",
            fontArg,
            brandText,
            fontArg,
            userText
        );

        List<String> cmd = new ArrayList<>();
        cmd.add(processingProperties.getFfmpegPath());
        cmd.add("-y");
        cmd.add("-i");
        cmd.add(input.toAbsolutePath().toString());
        cmd.add("-i");
        cmd.add(logoPng.toAbsolutePath().toString());
        cmd.add("-filter_complex");
        cmd.add(filter);
        cmd.add("-c:v");
        cmd.add("libx264");
        cmd.add("-pix_fmt");
        cmd.add("yuv420p");
        cmd.add("-profile:v");
        cmd.add("main");
        cmd.add("-preset");
        cmd.add("ultrafast");
        cmd.add("-threads");
        cmd.add("0");
        cmd.add("-crf");
        cmd.add("23");
        cmd.add("-c:a");
        cmd.add("aac");
        cmd.add("-b:a");
        cmd.add("128k");
        cmd.add("-movflags");
        cmd.add("+faststart");
        cmd.add(output.toAbsolutePath().toString());
        runProcess(cmd, output.getParent());
    }

    private static String escapeFfmpegText(String value) {
        return Objects.requireNonNullElse(value, "")
            .replace("\\", "\\\\")
            .replace(":", "\\:")
            .replace("'", "'\\''");
    }

    private void runProcess(List<String> command, Path workingDir) throws Exception {
        Path logFile = Files.createTempFile(workingDir, "ffmpeg-dl-", ".log");
        ProcessBuilder pb = new ProcessBuilder(command);
        pb.directory(workingDir.toFile());
        pb.redirectErrorStream(true);
        pb.redirectOutput(ProcessBuilder.Redirect.to(logFile.toFile()));
        Process p = pb.start();
        try {
            boolean finished = p.waitFor(30, TimeUnit.MINUTES);
            if (!finished) {
                p.destroyForcibly();
                throw new IllegalStateException("ffmpeg timeout khi tạo video tải về.");
            }
            if (p.exitValue() != 0) {
                String err = tailOfFile(logFile, 4000);
                throw new IllegalStateException("ffmpeg failed (exit " + p.exitValue() + "): " + err);
            }
        } finally {
            Files.deleteIfExists(logFile);
        }
    }

    private static String tailOfFile(Path logFile, int maxChars) throws IOException {
        if (!Files.exists(logFile) || Files.size(logFile) == 0) {
            return "";
        }
        long len = Files.size(logFile);
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

    public static void deleteRecursively(Path root) {
        try {
            if (!Files.exists(root)) {
                return;
            }
            try (var walk = Files.walk(root)) {
                walk.sorted((a, b) -> b.getNameCount() - a.getNameCount()).forEach((p) -> {
                    try {
                        Files.deleteIfExists(p);
                    } catch (IOException ignored) {
                        // best-effort
                    }
                });
            }
        } catch (IOException ignored) {
            // best-effort
        }
    }
}
