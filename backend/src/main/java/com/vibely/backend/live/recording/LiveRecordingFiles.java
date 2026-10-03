package com.vibely.backend.live.recording;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.InvalidPathException;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.util.Locale;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.util.StringUtils;

/**
 * DVR file paths come from an SRS hook body, so they are untrusted input: only regular FLV files
 * inside the configured DVR directory are ever read or deleted (no traversal, no symlinks).
 */
public final class LiveRecordingFiles {

    private static final Logger log = LoggerFactory.getLogger(LiveRecordingFiles.class);
    private static final String DVR_EXTENSION = ".flv";

    private LiveRecordingFiles() {}

    public static Path root(String dvrDir) {
        return Path.of(dvrDir).toAbsolutePath().normalize();
    }

    /** {@code file} may be relative to SRS's working directory {@code cwd} (SRS default config). */
    public static Optional<Path> resolve(Path root, String cwd, String file) {
        if (!StringUtils.hasText(file)) {
            return Optional.empty();
        }
        try {
            Path path = Path.of(file);
            if (!path.isAbsolute()) {
                if (!StringUtils.hasText(cwd)) {
                    return Optional.empty();
                }
                path = Path.of(cwd).resolve(path);
            }
            path = path.toAbsolutePath().normalize();
            if (!isInside(root, path)) {
                return Optional.empty();
            }
            if (!path.getFileName().toString().toLowerCase(Locale.ROOT).endsWith(DVR_EXTENSION)) {
                return Optional.empty();
            }
            if (!Files.isRegularFile(path, LinkOption.NOFOLLOW_LINKS)) {
                return Optional.empty();
            }
            return Optional.of(path);
        } catch (InvalidPathException ex) {
            return Optional.empty();
        }
    }

    public static boolean isInside(Path root, Path path) {
        return !path.equals(root) && path.startsWith(root);
    }

    public static long sizeOf(Path path) {
        try {
            return Files.size(path);
        } catch (IOException ex) {
            return 0;
        }
    }

    /** Best effort; refuses anything outside the DVR directory. */
    public static void deleteQuietly(Path root, Path path) {
        if (path == null || !isInside(root, path.toAbsolutePath().normalize())) {
            return;
        }
        try {
            Files.deleteIfExists(path);
        } catch (IOException ex) {
            log.warn("live.recording.file_delete_failed file={} reason={}", path.getFileName(), ex.getClass().getSimpleName());
        }
    }

    public static void deleteQuietly(Path root, String path) {
        if (!StringUtils.hasText(path)) {
            return;
        }
        try {
            deleteQuietly(root, Path.of(path));
        } catch (InvalidPathException ex) {
            // not a path we created
        }
    }
}
