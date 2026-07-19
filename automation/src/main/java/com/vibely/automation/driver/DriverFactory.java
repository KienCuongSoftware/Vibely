package com.vibely.automation.driver;

import com.vibely.automation.config.BrowserType;
import com.vibely.automation.config.ConfigReader;
import com.vibely.automation.driver.strategies.BraveStrategy;
import com.vibely.automation.driver.strategies.ChromeStrategy;
import com.vibely.automation.driver.strategies.EdgeStrategy;
import com.vibely.automation.driver.strategies.FirefoxStrategy;
import org.openqa.selenium.Dimension;
import org.openqa.selenium.WebDriver;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Duration;
import java.util.EnumMap;
import java.util.Map;

/**
 * Creates and manages the lifecycle of {@link WebDriver} instances, one per thread, so that
 * tests can run safely in parallel.
 *
 * <p>The browser to launch is resolved from the {@code browser} key in
 * {@code config.properties} and delegated to the matching {@link BrowserStrategy}.</p>
 */
public final class DriverFactory {

    private static final Logger LOGGER = LoggerFactory.getLogger(DriverFactory.class);
    private static final ThreadLocal<WebDriver> DRIVER_THREAD_LOCAL = new ThreadLocal<>();
    private static final Map<BrowserType, BrowserStrategy> STRATEGIES = new EnumMap<>(BrowserType.class);

    static {
        STRATEGIES.put(BrowserType.BRAVE, new BraveStrategy());
        STRATEGIES.put(BrowserType.CHROME, new ChromeStrategy());
        STRATEGIES.put(BrowserType.EDGE, new EdgeStrategy());
        STRATEGIES.put(BrowserType.FIREFOX, new FirefoxStrategy());
    }

    private DriverFactory() {
    }

    /**
     * Initializes a new {@link WebDriver} for the current thread, based on the browser
     * configured in {@code config.properties}. If a driver is already initialized for this
     * thread, this method does nothing.
     */
    public static void initDriver() {
        if (DRIVER_THREAD_LOCAL.get() != null) {
            LOGGER.warn("Driver already initialized for thread '{}'. Skipping re-initialization.",
                    Thread.currentThread().getName());
            return;
        }

        String browserName = ConfigReader.getProperty("browser", "chrome");
        BrowserType browserType = BrowserType.fromString(browserName);
        BrowserStrategy strategy = STRATEGIES.get(browserType);

        if (strategy == null) {
            throw new IllegalStateException("No browser strategy registered for: " + browserType);
        }

        LOGGER.info("Opening browser '{}' on thread '{}'...", browserType, Thread.currentThread().getName());
        WebDriver driver = strategy.create();

        configureTimeoutsAndWindow(driver);
        ChromiumPermissionUtils.denyBlockingPermissions(driver);

        DRIVER_THREAD_LOCAL.set(driver);
        LOGGER.info("Browser '{}' opened successfully.", browserType);
    }

    private static void configureTimeoutsAndWindow(WebDriver driver) {
        int implicitWaitSeconds = ConfigReader.getIntProperty("implicit.wait", 0);
        driver.manage().timeouts().implicitlyWait(Duration.ofSeconds(implicitWaitSeconds));

        boolean headless = ConfigReader.getBooleanProperty("headless", false);
        if (headless) {
            int width = ConfigReader.getIntProperty("window.width", 1920);
            int height = ConfigReader.getIntProperty("window.height", 1080);
            driver.manage().window().setSize(new Dimension(width, height));
        } else {
            driver.manage().window().maximize();
        }
    }

    /**
     * Returns the {@link WebDriver} instance bound to the current thread.
     *
     * @return the active {@link WebDriver} for this thread
     * @throws IllegalStateException if {@link #initDriver()} has not been called on this thread
     */
    public static WebDriver getDriver() {
        WebDriver driver = DRIVER_THREAD_LOCAL.get();
        if (driver == null) {
            throw new IllegalStateException("Driver has not been initialized. Call DriverFactory.initDriver() first.");
        }
        return driver;
    }

    /**
     * Quits the {@link WebDriver} bound to the current thread, if any, and removes it from the
     * thread-local storage.
     */
    public static void quitDriver() {
        WebDriver driver = DRIVER_THREAD_LOCAL.get();
        if (driver == null) {
            return;
        }

        LOGGER.info("Closing browser on thread '{}'...", Thread.currentThread().getName());
        try {
            driver.quit();
            LOGGER.info("Browser closed successfully.");
        } finally {
            DRIVER_THREAD_LOCAL.remove();
        }
    }
}
