package com.vibely.backend.video.download;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;

/** Resolves a TTF font path for FFmpeg drawtext on the host OS. */
final class FfmpegFontResolver {

    private FfmpegFontResolver() {}

    static String resolveFontFile() {
        String os = System.getProperty("os.name", "").toLowerCase(Locale.ROOT);
        if (os.contains("win")) {
            String found = firstExisting(
                "C:/Windows/Fonts/segoeuib.ttf",
                "C:/Windows/Fonts/arialbd.ttf",
                "C:/Windows/Fonts/arial.ttf"
            );
            if (found != null) {
                return found;
            }
        }
        if (os.contains("mac")) {
            String found = firstExisting(
                "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
                "/System/Library/Fonts/Supplemental/Arial.ttf",
                "/Library/Fonts/Arial.ttf"
            );
            if (found != null) {
                return found;
            }
        }
        return firstExisting(
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
        );
    }

    /** FFmpeg filter path: forward slashes, colon escaped. */
    static String ffmpegFontArg(String fontPath) {
        return fontPath.replace("\\", "/").replace(":", "\\:");
    }

    private static String firstExisting(String... candidates) {
        for (String candidate : candidates) {
            if (candidate != null && Files.isRegularFile(Path.of(candidate))) {
                return candidate;
            }
        }
        return null;
    }
}
