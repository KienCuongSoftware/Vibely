package com.vibely.automation.pages;

import com.vibely.automation.base.BasePage;
import io.qameta.allure.Step;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;

/**
 * Post-login shell used to assert a successful login landed on the app.
 */
public class HomePage extends BasePage {

    private final By feedRoot = By.cssSelector("video, [data-feed], main, [href='/foryou'], a[href*='/foryou']");

    /** @param driver active WebDriver */
    public HomePage(WebDriver driver) {
        super(driver);
    }

    /** Returns {@code true} when authenticated home chrome is present. */
    @Step("Verify home loaded")
    public boolean isLoaded() {
        return isDisplayed(feedRoot) || !getCurrentUrl().contains("/login");
    }
}
