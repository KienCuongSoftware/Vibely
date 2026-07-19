package com.vibely.automation.utils;

import io.qameta.allure.Allure;
import org.openqa.selenium.OutputType;
import org.openqa.selenium.TakesScreenshot;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.logging.LogEntries;
import org.openqa.selenium.logging.LogEntry;
import org.openqa.selenium.logging.LogType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.ByteArrayInputStream;

/**
 * Attaches diagnostic artifacts (screenshots, page source, console logs, current URL) to the
 * Allure report.
 */
public final class AttachmentUtils {

    private static final Logger LOGGER = LoggerFactory.getLogger(AttachmentUtils.class);

    private AttachmentUtils() {
    }

    /**
     * Attaches a screenshot of the current browser state to the Allure report.
     *
     * @param driver the active {@link WebDriver}
     * @param name   the attachment name shown in the report
     */
    public static void attachScreenshot(WebDriver driver, String name) {
        byte[] screenshot = ((TakesScreenshot) driver).getScreenshotAs(OutputType.BYTES);
        Allure.addAttachment(name, new ByteArrayInputStream(screenshot));
    }

    /**
     * Attaches the current page's HTML source to the Allure report.
     *
     * @param driver the active {@link WebDriver}
     */
    public static void attachPageSource(WebDriver driver) {
        Allure.addAttachment("Page Source", "text/html", driver.getPageSource(), ".html");
    }

    /**
     * Attaches the current page URL to the Allure report.
     *
     * @param driver the active {@link WebDriver}
     */
    public static void attachCurrentUrl(WebDriver driver) {
        Allure.addAttachment("Current URL", "text/plain", driver.getCurrentUrl(), ".txt");
    }

    /**
     * Attaches the browser's JavaScript console logs to the Allure report, if the driver
     * supports retrieving them.
     *
     * @param driver the active {@link WebDriver}
     */
    public static void attachConsoleLogs(WebDriver driver) {
        try {
            LogEntries logEntries = driver.manage().logs().get(LogType.BROWSER);
            StringBuilder builder = new StringBuilder();
            for (LogEntry entry : logEntries) {
                builder.append(entry).append(System.lineSeparator());
            }
            Allure.addAttachment("Browser Console Logs", "text/plain",
                    builder.length() == 0 ? "No console logs captured." : builder.toString(), ".txt");
        } catch (Exception e) {
            LOGGER.debug("Unable to retrieve browser console logs: {}", e.getMessage());
            Allure.addAttachment("Browser Console Logs", "text/plain",
                    "Console logs unavailable: " + e.getMessage(), ".txt");
        }
    }

    /**
     * Attaches an arbitrary block of plain text to the Allure report.
     *
     * @param name    the attachment name shown in the report
     * @param content the text content to attach
     */
    public static void attachText(String name, String content) {
        Allure.addAttachment(name, "text/plain", content == null ? "" : content, ".txt");
    }
}
