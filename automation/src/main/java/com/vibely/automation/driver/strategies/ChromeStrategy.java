package com.vibely.automation.driver.strategies;

import com.vibely.automation.driver.BrowserOptionsFactory;
import com.vibely.automation.driver.BrowserStrategy;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;

/**
 * {@link BrowserStrategy} that launches a standard Google Chrome session.
 */
public class ChromeStrategy implements BrowserStrategy {

    @Override
    public WebDriver create() {
        ChromeOptions options = BrowserOptionsFactory.chromeOptions();
        return new ChromeDriver(options);
    }
}
