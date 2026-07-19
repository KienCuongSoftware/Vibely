package com.vibely.automation.driver.strategies;

import com.vibely.automation.driver.BrowserOptionsFactory;
import com.vibely.automation.driver.BrowserStrategy;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.firefox.FirefoxDriver;
import org.openqa.selenium.firefox.FirefoxOptions;

/**
 * {@link BrowserStrategy} that launches a Mozilla Firefox session.
 */
public class FirefoxStrategy implements BrowserStrategy {

    @Override
    public WebDriver create() {
        FirefoxOptions options = BrowserOptionsFactory.firefoxOptions();
        return new FirefoxDriver(options);
    }
}
