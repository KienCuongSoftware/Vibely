package com.vibely.automation.driver;

import com.vibely.automation.config.ConfigReader;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.net.ServerSocket;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

/**
 * Starts a Brave process with an isolated profile and remote-debugging port so ChromeDriver can
 * attach via {@code debuggerAddress}. Direct ChromeDriver launches of Brave frequently crash on
 * Windows ({@code DevToolsActivePort file doesn't exist}).
 */
public final class BraveProcessLauncher {

    private static final Logger LOGGER = LoggerFactory.getLogger(BraveProcessLauncher.class);
    private static final Duration READY_TIMEOUT = Duration.ofSeconds(30);

    private BraveProcessLauncher() {
    }

    public record Session(Process process, int debuggingPort, Path userDataDir) {
        public String debuggerAddress() {
            return "127.0.0.1:" + debuggingPort;
        }

        public void destroy() {
            if (process != null && process.isAlive()) {
                process.descendants().forEach(ProcessHandle::destroyForcibly);
                process.destroyForcibly();
                try {
                    process.waitFor();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }
            if (userDataDir != null) {
                try {
                    deleteRecursively(userDataDir);
                } catch (IOException ignored) {
                    // best-effort cleanup of temp profile
                }
            }
        }

        private static void deleteRecursively(Path root) throws IOException {
            if (!Files.exists(root)) {
                return;
            }
            try (var walk = Files.walk(root)) {
                walk.sorted((a, b) -> b.compareTo(a)).forEach(path -> {
                    try {
                        Files.deleteIfExists(path);
                    } catch (IOException ignored) {
                        // ignore locked files
                    }
                });
            }
        }
    }

    public static Session start() {
        String bravePath = ConfigReader.getProperty("brave.path");
        Path binary = Path.of(bravePath);
        if (!Files.isRegularFile(binary)) {
            throw new IllegalStateException(
                    "Brave binary not found at configured path: " + bravePath
                            + ". Update brave.path in config.properties, or switch browser=chrome.");
        }

        Path userDataDir;
        try {
            userDataDir = Files.createTempDirectory("vibely-brave-profile-");
            writeAutomationProfilePrefs(userDataDir);
        } catch (IOException e) {
            throw new IllegalStateException("Failed to create temporary Brave user-data-dir", e);
        }

        int port = findFreePort();
        boolean headless = ConfigReader.getBooleanProperty("headless", false);
        int width = ConfigReader.getIntProperty("window.width", 1920);
        int height = ConfigReader.getIntProperty("window.height", 1080);

        List<String> command = new ArrayList<>();
        command.add(binary.toAbsolutePath().toString());
        command.add("--user-data-dir=" + userDataDir.toAbsolutePath());
        command.add("--remote-debugging-port=" + port);
        command.add("--remote-allow-origins=*");
        command.add("--no-first-run");
        command.add("--no-default-browser-check");
        command.add("--disable-popup-blocking");
        command.add("--disable-notifications");
        // Auto-deny geolocation/camera/mic prompts so login is not blocked by Brave dialogs.
        command.add("--deny-permission-prompts");
        command.add("--disable-blink-features=AutomationControlled");
        command.add("--window-size=" + width + "," + height);
        if (headless) {
            command.add("--headless=new");
            command.add("--disable-gpu");
        }
        command.add("about:blank");

        LOGGER.info("Starting Brave process for CDP attach on port {}...", port);
        ProcessBuilder builder = new ProcessBuilder(command);
        builder.redirectErrorStream(true);
        builder.redirectOutput(ProcessBuilder.Redirect.DISCARD);

        Process process;
        try {
            process = builder.start();
        } catch (IOException e) {
            throw new IllegalStateException("Failed to start Brave process", e);
        }

        Session session = new Session(process, port, userDataDir);
        try {
            waitUntilDevToolsReady(port);
            return session;
        } catch (RuntimeException e) {
            session.destroy();
            throw e;
        }
    }

    /**
     * Pre-seeds the Brave profile so permission and "Save password?" prompts are blocked before
     * the first page load (ChromeOptions prefs cannot be applied in CDP attach mode).
     */
    private static void writeAutomationProfilePrefs(Path userDataDir) throws IOException {
        Path defaultDir = userDataDir.resolve("Default");
        Files.createDirectories(defaultDir);
        String prefsJson = """
                {
                  "credentials_enable_service": false,
                  "profile": {
                    "password_manager_enabled": false,
                    "password_manager_leak_detection": false,
                    "default_content_setting_values": {
                      "geolocation": 2,
                      "notifications": 2,
                      "media_stream_camera": 2,
                      "media_stream_mic": 2
                    }
                  }
                }
                """;
        Files.writeString(defaultDir.resolve("Preferences"), prefsJson);
    }

    private static int findFreePort() {
        try (ServerSocket socket = new ServerSocket(0)) {
            socket.setReuseAddress(true);
            return socket.getLocalPort();
        } catch (IOException e) {
            throw new IllegalStateException("Unable to allocate a free debugging port for Brave", e);
        }
    }

    private static void waitUntilDevToolsReady(int port) {
        HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(2)).build();
        URI uri = URI.create("http://127.0.0.1:" + port + "/json/version");
        long deadline = System.nanoTime() + READY_TIMEOUT.toNanos();

        while (System.nanoTime() < deadline) {
            try {
                HttpRequest request = HttpRequest.newBuilder(uri).GET().timeout(Duration.ofSeconds(2)).build();
                HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
                if (response.statusCode() == 200 && response.body() != null && response.body().contains("webSocketDebuggerUrl")) {
                    LOGGER.info("Brave DevTools is ready on port {}.", port);
                    return;
                }
            } catch (IOException ignored) {
                // not ready yet
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new IllegalStateException("Interrupted while waiting for Brave DevTools", e);
            }

            try {
                Thread.sleep(200);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new IllegalStateException("Interrupted while waiting for Brave DevTools", e);
            }
        }

        throw new IllegalStateException(
                "Brave DevTools did not become ready on port " + port + " within " + READY_TIMEOUT.toSeconds() + "s");
    }
}

