package com.vibely.automation.base;

import com.vibely.automation.driver.DriverFactory;
import com.vibely.automation.support.AppAvailabilityUtils;
import com.vibely.automation.utils.AttachmentUtils;
import com.vibely.automation.utils.EnvironmentUtils;
import com.vibely.automation.utils.PropertyUtils;
import com.vibely.automation.utils.ScreenshotUtils;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.extension.AfterTestExecutionCallback;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.extension.ExtensionContext;
import org.openqa.selenium.WebDriver;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;

/**
 * Base class for all UI test classes.
 *
 * <p>Handles {@link WebDriver} lifecycle (creation before each test, teardown after each test)
 * and automatically captures a screenshot plus diagnostic Allure attachments (page source,
 * current URL, browser console logs) whenever a test fails.</p>
 *
 * <p>Concrete test classes only need to extend this class; the driver is available via the
 * protected {@link #driver} field.</p>
 */
@ExtendWith(BaseTest.FailureAttachmentExtension.class)
public abstract class BaseTest {

    protected static final Logger LOGGER = LoggerFactory.getLogger(BaseTest.class);

    protected WebDriver driver;

    /**
     * Initializes the {@link WebDriver} for the current thread and navigates to the configured
     * {@code base.url}, if any. Also writes the Allure {@code environment.properties} once per
     * run.
     */
    @BeforeEach
    void setUpDriver() {
        EnvironmentUtils.writeEnvironmentProperties();

        if (requiresApplication()) {
            AppAvailabilityUtils.assumeApplicationReachable();
        }

        LOGGER.info("Opening browser...");
        DriverFactory.initDriver();
        driver = DriverFactory.getDriver();

        String baseUrl = PropertyUtils.baseUrl();
        if (!baseUrl.isBlank() && requiresApplication()) {
            try {
                LOGGER.info("Navigating to {}...", baseUrl);
                driver.get(baseUrl);
                LOGGER.info("Navigated to base URL: {}", baseUrl);
            } catch (org.openqa.selenium.WebDriverException e) {
                LOGGER.warn(
                        "Base URL '{}' is not reachable yet ({}).",
                        baseUrl,
                        e.getClass().getSimpleName());
                driver.get("about:blank");
            }
        } else {
            driver.get("about:blank");
        }
    }

    /**
     * Whether this test class requires the Vibely frontend at {@code base.url}.
     *
     * <p>Framework-only tests should override and return {@code false}.</p>
     *
     * @return {@code true} by default
     */
    protected boolean requiresApplication() {
        return true;
    }

    /**
     * Quits the {@link WebDriver} bound to the current thread after each test.
     */
    @AfterEach
    void tearDownDriver() {
        LOGGER.info("Closing browser...");
        DriverFactory.quitDriver();
    }

    /**
     * JUnit 5 extension that captures a screenshot and attaches diagnostic information to the
     * Allure report whenever a test fails.
     *
     * <p>Implemented as an {@link AfterTestExecutionCallback} rather than a
     * {@code TestWatcher} so that it runs <em>before</em> {@code @AfterEach} tears down the
     * driver, guaranteeing the browser session is still alive when the screenshot is taken.</p>
     */
    static class FailureAttachmentExtension implements AfterTestExecutionCallback {

        @Override
        public void afterTestExecution(ExtensionContext context) {
            if (context.getExecutionException().isEmpty()) {
                return;
            }

            Throwable cause = context.getExecutionException().get();
            String testName = context.getDisplayName();

            context.getTestInstance()
                    .filter(BaseTest.class::isInstance)
                    .map(BaseTest.class::cast)
                    .map(base -> base.driver)
                    .ifPresent(webDriver -> {
                        LOGGER.error("Test failed: {}", testName, cause);

                        File screenshot = ScreenshotUtils.capture(webDriver, testName);
                        LOGGER.info("Failure screenshot saved to: {}", screenshot.getAbsolutePath());

                        AttachmentUtils.attachScreenshot(webDriver, "Failure Screenshot");
                        AttachmentUtils.attachPageSource(webDriver);
                        AttachmentUtils.attachCurrentUrl(webDriver);
                        AttachmentUtils.attachConsoleLogs(webDriver);
                    });
        }
    }
}
