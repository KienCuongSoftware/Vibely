package com.vibely.automation.driver;

import org.openqa.selenium.WebDriver;

/**
 * Strategy contract for creating a {@link WebDriver} instance for a specific browser.
 */
public interface BrowserStrategy {

    /**
     * Creates and returns a new {@link WebDriver} session for the browser this strategy
     * represents.
     *
     * @return a new, ready-to-use {@link WebDriver} instance
     */
    WebDriver create();
}
