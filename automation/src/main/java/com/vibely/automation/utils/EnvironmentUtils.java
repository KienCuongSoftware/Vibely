package com.vibely.automation.utils;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Properties;

/**
 * Writes an {@code environment.properties} file into the Allure results directory so that the
 * generated report displays environment/browser metadata for the run.
 */
public final class EnvironmentUtils {

    private static final Logger LOGGER = LoggerFactory.getLogger(EnvironmentUtils.class);
    private static volatile boolean written = false;

    private EnvironmentUtils() {
    }

    /**
     * Writes {@code environment.properties} into the configured Allure results directory.
     * Safe to call multiple times (e.g. once per test) as the file is only written once per
     * JVM run.
     */
    public static synchronized void writeEnvironmentProperties() {
        if (written) {
            return;
        }

        String resultsDirectory = System.getProperty("allure.results.directory", "allure-results");
        Path resultsPath = Path.of(resultsDirectory);

        Properties properties = new Properties();
        properties.setProperty("Browser", PropertyUtils.get("browser", "chrome"));
        properties.setProperty("Base.URL", PropertyUtils.baseUrl());
        properties.setProperty("Environment", PropertyUtils.environment());
        properties.setProperty("Headless", String.valueOf(PropertyUtils.getBoolean("headless", false)));
        properties.setProperty("OS", System.getProperty("os.name"));
        properties.setProperty("Java.Version", System.getProperty("java.version"));
        properties.setProperty("Project", "Vibely");
        properties.setProperty("Selenium.Version", "4.39.0");
        properties.setProperty("JUnit.Version", "5.11.4");
        properties.setProperty("Timestamp", java.time.Instant.now().toString());

        try {
            Files.createDirectories(resultsPath);
            try (OutputStream outputStream = Files.newOutputStream(resultsPath.resolve("environment.properties"))) {
                properties.store(outputStream, "Vibely automation environment");
            }
            Path categoriesSource = Path.of("src/test/resources/categories.json");
            if (Files.exists(categoriesSource)) {
                Files.copy(categoriesSource, resultsPath.resolve("categories.json"),
                        java.nio.file.StandardCopyOption.REPLACE_EXISTING);
            }
            written = true;
            LOGGER.info("environment.properties written to '{}'", resultsPath.toAbsolutePath());
        } catch (IOException e) {
            LOGGER.error("Failed to write environment.properties to '{}'", resultsPath.toAbsolutePath(), e);
        }
    }
}
