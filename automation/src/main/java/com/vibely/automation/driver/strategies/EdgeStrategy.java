package com.vibely.automation.driver.strategies;

import com.vibely.automation.driver.BrowserOptionsFactory;
import com.vibely.automation.driver.BrowserStrategy;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.edge.EdgeDriver;
import org.openqa.selenium.edge.EdgeOptions;

/**
 * {@link BrowserStrategy} that launches a Microsoft Edge session.
 */
public class EdgeStrategy implements BrowserStrategy {

    @Override
    public WebDriver create() {
        EdgeOptions options = BrowserOptionsFactory.edgeOptions();
        return new EdgeDriver(options);
    }
}
