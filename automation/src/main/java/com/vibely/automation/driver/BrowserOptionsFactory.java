package com.vibely.automation.driver;

import com.vibely.automation.config.ConfigReader;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.chromium.ChromiumOptions;
import org.openqa.selenium.edge.EdgeOptions;
import org.openqa.selenium.firefox.FirefoxOptions;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

/**
 * Builds browser-specific {@code Options} instances (Chrome, Edge, Firefox, Brave) using the
 * values defined in {@code config.properties}.
 *
 * <p>All Chromium-based browsers (Chrome, Edge, Brave) share the same set of arguments:
 * headless mode, a fixed window size, disabled infobars/popups/notifications and acceptance of
 * insecure certificates.</p>
 */
public final class BrowserOptionsFactory {

    private BrowserOptionsFactory() {
    }

    /**
     * Builds {@link ChromeOptions} for a standard Chrome session.
     *
     * @return configured {@link ChromeOptions}
     */
    public static ChromeOptions chromeOptions() {
        ChromeOptions options = new ChromeOptions();
        applyCommonChromiumArguments(options);
        return options;
    }

    /**
     * Builds {@link ChromeOptions} that attach to an already-running Brave process via CDP.
     *
     * @param debuggerAddress host:port of Brave remote debugging (e.g. {@code 127.0.0.1:9222})
     * @return configured {@link ChromeOptions} for attach mode
     */
    public static ChromeOptions braveAttachOptions(String debuggerAddress) {
        String bravePath = ConfigReader.getProperty("brave.path");
        Path binary = Path.of(bravePath);
        if (!Files.isRegularFile(binary)) {
            throw new IllegalStateException(
                    "Brave binary not found at configured path: " + bravePath
                            + ". Update brave.path in config.properties, or switch browser=chrome.");
        }

        ChromeOptions options = new ChromeOptions();
        options.setExperimentalOption("debuggerAddress", debuggerAddress);
        options.setAcceptInsecureCerts(true);
        // Match ChromeDriver to Brave Chromium major (not the installed Chrome version).
        String chromiumMajor = detectBraveChromiumMajor(binary)
                .orElseThrow(() -> new IllegalStateException(
                        "Could not detect Brave Chromium version under " + binary.getParent()
                                + ". Update Brave or switch browser=chrome."));
        options.setBrowserVersion(chromiumMajor);
        return options;
    }

    /**
     * Builds {@link EdgeOptions} for a Microsoft Edge session.
     *
     * @return configured {@link EdgeOptions}
     */
    public static EdgeOptions edgeOptions() {
        EdgeOptions options = new EdgeOptions();
        applyCommonChromiumArguments(options);
        return options;
    }

    /**
     * Builds {@link FirefoxOptions} for a Firefox session.
     *
     * @return configured {@link FirefoxOptions}
     */
    public static FirefoxOptions firefoxOptions() {
        FirefoxOptions options = new FirefoxOptions();
        boolean headless = ConfigReader.getBooleanProperty("headless", false);
        int width = ConfigReader.getIntProperty("window.width", 1920);
        int height = ConfigReader.getIntProperty("window.height", 1080);

        if (headless) {
            options.addArguments("-headless");
        }
        options.addArguments("-width", String.valueOf(width), "-height", String.valueOf(height));
        options.setAcceptInsecureCerts(true);
        return options;
    }

    private static void applyCommonChromiumArguments(ChromiumOptions<?> options) {
        boolean headless = ConfigReader.getBooleanProperty("headless", false);
        int width = ConfigReader.getIntProperty("window.width", 1920);
        int height = ConfigReader.getIntProperty("window.height", 1080);

        if (headless) {
            options.addArguments("--headless=new");
        }

        options.addArguments(
                "--window-size=" + width + "," + height,
                "--disable-infobars",
                "--disable-popup-blocking",
                "--disable-notifications",
                "--deny-permission-prompts",
                "--disable-blink-features=AutomationControlled",
                "--remote-allow-origins=*",
                "--no-first-run",
                "--no-default-browser-check"
        );
        Map<String, Object> prefs = new HashMap<>();
        // 2 = block; prevents "Know your location" dialogs during login.
        prefs.put("profile.default_content_setting_values.geolocation", 2);
        prefs.put("profile.default_content_setting_values.notifications", 2);
        options.setExperimentalOption("prefs", prefs);
        options.setExperimentalOption("excludeSwitches", java.util.List.of("enable-automation"));
        options.setAcceptInsecureCerts(true);
    }

    private static final Pattern BRAVE_VERSION_DIR = Pattern.compile("^(\\d+)\\.\\d+\\.\\d+\\.\\d+$");

    /**
     * Reads Brave's Chromium major from the versioned folder next to {@code brave.exe}
     * (e.g. {@code Application/150.1.92.141/}).
     */
    static Optional<String> detectBraveChromiumMajor(Path braveBinary) {
        Path applicationDir = braveBinary.getParent();
        if (applicationDir == null || !Files.isDirectory(applicationDir)) {
            return Optional.empty();
        }

        try (Stream<Path> children = Files.list(applicationDir)) {
            return children
                    .filter(Files::isDirectory)
                    .map(path -> path.getFileName().toString())
                    .map(BRAVE_VERSION_DIR::matcher)
                    .filter(Matcher::matches)
                    .map(matcher -> matcher.group(1))
                    .max(Comparator.comparingInt(Integer::parseInt));
        } catch (IOException e) {
            return Optional.empty();
        }
    }
}
