package com.vibely.backend.video.download;

import com.vibely.backend.common.NotFoundException;
import com.vibely.backend.processing.ProcessingProperties;
import com.vibely.backend.processing.WindowsFfmpegPathResolver;
import com.vibely.backend.storage.ResolvedS3Object;
import com.vibely.backend.storage.S3ObjectUrlBuilder;
import com.vibely.backend.user.User;
import com.vibely.backend.user.UserRepository;
import com.vibely.backend.video.Video;
import com.vibely.backend.video.VideoRepository;
import com.vibely.backend.video.VideoStatus;
import java.io.IOException;
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
import software.amazon.awssdk.core.sync.ResponseTransformer;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;

/**
 * Renders a downloadable MP4 with Vibely logo + @username watermark (TikTok-style).
 */
@Service
@ConditionalOnProperty(prefix = "app.s3", name = "enabled", havingValue = "true")
public class VideoWatermarkDownloadService {

    private static final Logger log = LoggerFactory.getLogger(VideoWatermarkDownloadService.class);

    private final S3Client s3Client;
    private final S3ObjectUrlBuilder objectUrlBuilder;
    private final ProcessingProperties processingProperties;
    private final VideoRepository videoRepository;
    private final UserRepository userRepository;

    public VideoWatermarkDownloadService(
        S3Client s3Client,
        S3ObjectUrlBuilder objectUrlBuilder,
        ProcessingProperties processingProperties,
        VideoRepository videoRepository,
        UserRepository userRepository
    ) {
        this.s3Client = s3Client;
        this.objectUrlBuilder = objectUrlBuilder;
        this.processingProperties = processingProperties;
        this.videoRepository = videoRepository;
        this.userRepository = userRepository;
    }

    /**
     * @return path to watermarked MP4 inside a temp work directory (caller deletes parent dir)
     */
    public Path renderWatermarkedMp4(UUID publicId, String viewerEmail) throws Exception {
        DownloadContext ctx = resolveDownloadContext(publicId, viewerEmail);
        ResolvedS3Object source = objectUrlBuilder.resolveObjectFromUrl(ctx.rawVideoUrl())
            .orElseThrow(() -> new IllegalStateException("URL video không map được sang S3."));

        Path workRoot = Files.createTempDirectory("vibely-dl-" + publicId + "-");
        try {
            Path sourceFile = workRoot.resolve("source" + extensionFromKey(source.key()));
            downloadObject(source.bucket(), source.key(), sourceFile);
            Path logoPng = VibelyWatermarkLogo.materializePng(workRoot);
            Path output = workRoot.resolve("download.mp4");
            transcodeWithWatermark(sourceFile, logoPng, output, ctx.username());
            log.info("Watermarked download ready publicId={} author=@{}", publicId, ctx.username());
            return output;
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
        String username = author != null && author.getUsername() != null
            ? author.getUsername().trim()
            : "vibely";
        if (username.isBlank()) {
            username = "vibely";
        }
        return new DownloadContext(rawUrl, username);
    }

    private record DownloadContext(String rawVideoUrl, String username) {}

    private void assertViewable(Video video, String viewerEmail) {
        if (video.getStatus() == VideoStatus.REMOVED) {
            throw new NotFoundException("Không tìm thấy video");
        }
        if (video.getStatus() == VideoStatus.READY) {
            return;
        }
        if (viewerEmail == null || viewerEmail.isBlank()) {
            throw new NotFoundException("Không tìm thấy video");
        }
        User viewer = userRepository.findByEmail(viewerEmail.trim())
            .orElseThrow(() -> new NotFoundException("Không tìm thấy video"));
        if (!Objects.equals(video.getAuthor().getId(), viewer.getId())) {
            throw new NotFoundException("Không tìm thấy video");
        }
    }

    private void downloadObject(String bucket, String key, Path dest) {
        s3Client.getObject(
            GetObjectRequest.builder().bucket(bucket).key(key).build(),
            ResponseTransformer.toFile(dest)
        );
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
        cmd.add("veryfast");
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
