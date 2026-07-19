package com.vibely.automation.driver.strategies;

import com.vibely.automation.driver.BraveProcessLauncher;
import com.vibely.automation.driver.BrowserOptionsFactory;
import com.vibely.automation.driver.BrowserStrategy;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Launches Brave in a separate process, then attaches ChromeDriver via CDP
 * ({@code debuggerAddress}). Direct {@code new ChromeDriver(braveOptions)} often crashes Brave
 * on Windows with {@code DevToolsActivePort file doesn't exist}.
 */
public class BraveStrategy implements BrowserStrategy {

    private static final Logger LOGGER = LoggerFactory.getLogger(BraveStrategy.class);

    @Override
    public WebDriver create() {
        BraveProcessLauncher.Session session = BraveProcessLauncher.start();
        ChromeOptions options = BrowserOptionsFactory.braveAttachOptions(session.debuggerAddress());
        LOGGER.info("Attaching ChromeDriver to Brave at {}", session.debuggerAddress());

        ChromeDriver driver;
        try {
            driver = new ChromeDriver(options) {
                @Override
                public void quit() {
                    try {
                        super.quit();
                    } finally {
                        session.destroy();
                    }
                }
            };
        } catch (RuntimeException e) {
            session.destroy();
            throw e;
        }

        return driver;
    }
}
