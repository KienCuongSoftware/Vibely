package com.vibely.automation.utils;

import org.apache.commons.io.FileUtils;
import org.openqa.selenium.OutputType;
import org.openqa.selenium.TakesScreenshot;
import org.openqa.selenium.WebDriver;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;
import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Captures browser screenshots to disk under {@code screenshots/yyyy-MM-dd/}.
 */
public final class ScreenshotUtils {

    private static final Logger LOGGER = LoggerFactory.getLogger(ScreenshotUtils.class);
    private static final String SCREENSHOTS_ROOT = "screenshots";
    private static final DateTimeFormatter DATE_DIR_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter TIMESTAMP_FORMAT = DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss");

    private ScreenshotUtils() {
    }

    /**
     * Captures a screenshot of the current browser window and saves it to
     * {@code screenshots/yyyy-MM-dd/<testName>_yyyyMMdd_HHmmss.png}.
     *
     * @param driver   the active {@link WebDriver}
     * @param testName the name used to build the screenshot file name
     * @return the {@link File} the screenshot was written to (whether or not the write succeeded)
     */
    public static File capture(WebDriver driver, String testName) {
        if (driver == null) {
            throw new IllegalArgumentException("WebDriver must not be null when capturing a screenshot");
        }

        String dateDir = LocalDate.now().format(DATE_DIR_FORMAT);
        String timestamp = LocalDateTime.now().format(TIMESTAMP_FORMAT);
        String fileName = sanitize(testName) + "_" + timestamp + ".png";

        File destination = new File(SCREENSHOTS_ROOT + File.separator + dateDir, fileName);

        try {
            File source = ((TakesScreenshot) driver).getScreenshotAs(OutputType.FILE);
            FileUtils.copyFile(source, destination);
            LOGGER.info("Screenshot captured: {}", destination.getAbsolutePath());
        } catch (IOException e) {
            LOGGER.error("Failed to save screenshot to '{}'", destination.getAbsolutePath(), e);
        }

        return destination;
    }

    /**
     * Captures a screenshot of the current browser window as an in-memory byte array, useful
     * for attaching directly to reports without touching the filesystem.
     *
     * @param driver the active {@link WebDriver}
     * @return the PNG screenshot bytes
     */
    public static byte[] captureAsBytes(WebDriver driver) {
        if (driver == null) {
            throw new IllegalArgumentException("WebDriver must not be null when capturing a screenshot");
        }
        return ((TakesScreenshot) driver).getScreenshotAs(OutputType.BYTES);
    }

    private static String sanitize(String testName) {
        return testName == null || testName.isBlank()
                ? "screenshot"
                : testName.replaceAll("[^a-zA-Z0-9-_]", "_");
    }
}
