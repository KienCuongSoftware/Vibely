package com.vibely.automation.support;

import com.vibely.automation.config.ConfigReader;

import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Resolves the local video file used by upload tests.
 *
 * <p>Priority: {@code TEST_VIDEO_PATH} env, {@code -Dtest.video.path}, then
 * {@code credentials.local.properties} / {@code config.properties}.</p>
 */
public final class TestVideoPath {

    private TestVideoPath() {
    }

    /** Absolute path to a local {@code .mp4}/{@code .mov}/{@code .webm} file. */
    public static String path() {
        return firstNonBlank(
                System.getenv("TEST_VIDEO_PATH"),
                System.getProperty("test.video.path"),
                ConfigReader.getProperty("test.video.path", ""));
    }

    /** {@code true} when the configured path points to an existing file. */
    public static boolean isConfigured() {
        String value = path();
        if (value.isBlank()) {
            return false;
        }
        return Files.isRegularFile(Path.of(value));
    }

    private static String firstNonBlank(String... values) {
        if (values == null) {
            return "";
        }
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return "";
    }
}
