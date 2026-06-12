package com.vibely.backend.processing;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * On Windows, {@code ProcessBuilder("ffprobe")} often fails with CreateProcess error=2 when the JVM
 * process PATH differs from an interactive CMD (IDE / spring-boot:run). Resolves bare {@code ffmpeg}
 * / {@code ffprobe} to absolute .exe paths when possible.
 */
public final class WindowsFfmpegPathResolver {

    private static final Logger log = LoggerFactory.getLogger(WindowsFfmpegPathResolver.class);

    private WindowsFfmpegPathResolver() {}

    public static void applyIfNeeded(ProcessingProperties props) {
        String os = System.getProperty("os.name", "");
        if (os == null || !os.toLowerCase(Locale.ROOT).contains("win")) {
            return;
        }
        String ff = props.getFfmpegPath();
        if (isBareName(ff, "ffmpeg")) {
            String resolved = resolveExecutable("ffmpeg");
            if (resolved != null) {
                log.info("Windows: resolved ffmpegPath from \"{}\" to \"{}\"", ff, resolved);
                props.setFfmpegPath(resolved);
            }
        }
        String fp = props.getFfprobePath();
        if (isBareName(fp, "ffprobe")) {
            String resolved = resolveExecutable("ffprobe");
            if (resolved != null) {
                log.info("Windows: resolved ffprobePath from \"{}\" to \"{}\"", fp, resolved);
                props.setFfprobePath(resolved);
            }
        }
    }

    private static boolean isBareName(String configured, String base) {
        if (configured == null) {
            return false;
        }
        String t = configured.trim();
        return t.equalsIgnoreCase(base) || t.equalsIgnoreCase(base + ".exe");
    }

    private static String resolveExecutable(String nameWithoutExt) {
        String exe = nameWithoutExt.toLowerCase(Locale.ROOT).endsWith(".exe")
            ? nameWithoutExt
            : nameWithoutExt + ".exe";
        String fromPath = findInProcessPath(exe);
        if (fromPath != null) {
            return fromPath;
        }
        String fromWhere = queryWhereCmd(exe);
        if (fromWhere != null) {
            return fromWhere;
        }
        String fromCFfmpeg = findUnderCFfmpeg(exe);
        if (fromCFfmpeg != null) {
            return fromCFfmpeg;
        }
        String fromDownloads = findUnderUserDownloads(exe);
        if (fromDownloads != null) {
            return fromDownloads;
        }
        return firstExisting(fixedWindowsCandidates(exe));
    }

    /**
     * Team default on Windows: {@code C:\FFmpeg\ffmpeg-*-essentials_build\bin\*.exe}.
     */
    private static String findUnderCFfmpeg(String exeFile) {
        return findFfmpegEssentialsBin(Paths.get("C:\\FFmpeg"), exeFile);
    }

    /**
     * Gyan builds are often extracted under {@code Downloads/ffmpeg-*-essentials_build/.../bin/},
     * which interactive CMD may see via user PATH but the JVM process may not.
     */
    private static String findUnderUserDownloads(String exeFile) {
        String profile = System.getenv("USERPROFILE");
        if (profile == null || profile.isBlank()) {
            return null;
        }
        return findFfmpegEssentialsBin(Paths.get(profile, "Downloads"), exeFile);
    }

    private static String findFfmpegEssentialsBin(Path root, String exeFile) {
        if (root == null || !Files.isDirectory(root)) {
            return null;
        }
        try (DirectoryStream<Path> tops = Files.newDirectoryStream(root)) {
            for (Path top : tops) {
                if (!Files.isDirectory(top)) {
                    continue;
                }
                String folder = top.getFileName().toString().toLowerCase(Locale.ROOT);
                if (!folder.contains("ffmpeg")) {
                    continue;
                }
                Path directBin = top.resolve("bin").resolve(exeFile);
                if (Files.isRegularFile(directBin)) {
                    return directBin.toAbsolutePath().normalize().toString();
                }
                try (DirectoryStream<Path> mids = Files.newDirectoryStream(top, Files::isDirectory)) {
                    for (Path mid : mids) {
                        Path nestedBin = mid.resolve("bin").resolve(exeFile);
                        if (Files.isRegularFile(nestedBin)) {
                            return nestedBin.toAbsolutePath().normalize().toString();
                        }
                    }
                }
            }
        } catch (Exception ignored) {
            return null;
        }
        return null;
    }

    private static String findInProcessPath(String exeFile) {
        String pathEnv = System.getenv("PATH");
        if (pathEnv == null || pathEnv.isBlank()) {
            return null;
        }
        for (String dir : pathEnv.split(";")) {
            if (dir.isBlank()) {
                continue;
            }
            Path candidate = Paths.get(dir.trim(), exeFile);
            if (Files.isRegularFile(candidate)) {
                return candidate.toAbsolutePath().normalize().toString();
            }
        }
        return null;
    }

    private static String queryWhereCmd(String exeFile) {
        try {
            ProcessBuilder pb = new ProcessBuilder("cmd.exe", "/c", "where", exeFile);
            pb.redirectErrorStream(true);
            Process p = pb.start();
            if (!p.waitFor(15, TimeUnit.SECONDS)) {
                p.destroyForcibly();
                return null;
            }
            if (p.exitValue() != 0) {
                return null;
            }
            try (BufferedReader r = new BufferedReader(new InputStreamReader(p.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = r.readLine()) != null) {
                    String t = line.trim();
                    if (t.isEmpty()) {
                        continue;
                    }
                    Path candidate = Paths.get(t);
                    if (Files.isRegularFile(candidate)) {
                        return candidate.toAbsolutePath().normalize().toString();
                    }
                }
            }
        } catch (Exception ignored) {
            // fall through
        }
        return null;
    }

    private static List<Path> fixedWindowsCandidates(String exeFile) {
        List<Path> out = new ArrayList<>();
        out.add(Paths.get("C:\\FFmpeg\\ffmpeg-8.1.1-essentials_build\\bin", exeFile));
        out.add(Paths.get("C:\\ffmpeg\\bin", exeFile));
        String pf = System.getenv("ProgramFiles");
        if (pf != null && !pf.isBlank()) {
            out.add(Paths.get(pf, "ffmpeg", "bin", exeFile));
        }
        String pf86 = System.getenv("ProgramFiles(x86)");
        if (pf86 != null && !pf86.isBlank()) {
            out.add(Paths.get(pf86, "ffmpeg", "bin", exeFile));
        }
        String chocolatey = System.getenv("ChocolateyInstall");
        if (chocolatey != null && !chocolatey.isBlank()) {
            out.add(Paths.get(chocolatey, "bin", exeFile));
        }
        String local = System.getenv("LOCALAPPDATA");
        if (local != null && !local.isBlank()) {
            out.add(Paths.get(local, "Microsoft", "WinGet", "Links", exeFile));
        }
        String scoop = System.getenv("USERPROFILE");
        if (scoop != null && !scoop.isBlank()) {
            out.add(Paths.get(scoop, "scoop", "shims", exeFile));
        }
        return out;
    }

    private static String firstExisting(List<Path> paths) {
        for (Path p : paths) {
            if (Files.isRegularFile(p)) {
                return p.toAbsolutePath().normalize().toString();
            }
        }
        return null;
    }
}
