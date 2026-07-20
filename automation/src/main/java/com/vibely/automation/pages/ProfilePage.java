package com.vibely.automation.pages;

import com.vibely.automation.base.BasePage;
import com.vibely.automation.utils.PropertyUtils;
import com.vibely.automation.utils.WaitUtils;
import io.qameta.allure.Step;
import org.openqa.selenium.By;
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Duration;

/**
 * Public profile page ({@code /@username}).
 */
public class ProfilePage extends BasePage {

    private static final Logger LOGGER = LoggerFactory.getLogger(ProfilePage.class);

    /**
     * Profile CTA next to Follow — avoids the sidebar {@code Tin nhắn} nav item
     * (same label; that opens an empty inbox without {@code ?c=}).
     */
    private final By messageButton = By.cssSelector("button[data-testid='profile-message-button']");
    private final By messageButtonFallback = By.xpath(
            "//button[normalize-space()='Follow'"
                    + " or normalize-space()='\u0110\u00e3 follow'"
                    + " or normalize-space()='\u0110\u00e3 y\u00eau c\u1ea7u'"
                    + " or normalize-space()='\u0110ang l\u01b0u...']"
                    + "/following-sibling::button[normalize-space()='Tin nh\u1eafn']");
    private final By composerInput = By.cssSelector("input[placeholder='Nh\u1eadp tin nh\u1eafn...']");
    private final By profileNotice = By.cssSelector("p.text-sm.text-zinc-400");

    /** @param driver active WebDriver */
    public ProfilePage(WebDriver driver) {
        super(driver);
    }

    /** Opens {@code /@{username}} (leading {@code @} optional). */
    @Step("Open profile @{0}")
    public ProfilePage open(String username) {
        String raw = username == null ? "" : username.trim();
        final String slug = raw.startsWith("@") ? raw.substring(1) : raw;
        driver.get(PropertyUtils.baseUrl() + "/@" + slug);
        WaitUtils.wait(driver, Duration.ofSeconds(20)).until(d ->
                !d.findElements(messageButton).isEmpty()
                        || !d.findElements(messageButtonFallback).isEmpty()
                        || d.getCurrentUrl().toLowerCase().contains(slug.toLowerCase()));
        WaitUtils.wait(driver, Duration.ofSeconds(15)).until(d ->
                !d.findElements(messageButton).isEmpty()
                        || !d.findElements(messageButtonFallback).isEmpty());
        return this;
    }

    /**
     * Clicks profile {@code Tin nhắn} and waits until a conversation is open
     * ({@code /messages?c=} with composer — enabled or disabled pending request).
     */
    @Step("Click Tin nhắn on profile")
    public MessagesPage clickMessage() {
        WaitUtils.wait(driver, Duration.ofSeconds(15)).until(d ->
                d.findElements(messageButton).stream().anyMatch(WebElement::isDisplayed)
                        || d.findElements(messageButtonFallback).stream().anyMatch(WebElement::isDisplayed));
        WebElement button = driver.findElements(messageButton).stream()
                .filter(WebElement::isDisplayed)
                .findFirst()
                .orElseGet(() -> driver.findElements(messageButtonFallback).stream()
                        .filter(WebElement::isDisplayed)
                        .findFirst()
                        .orElseThrow(() -> new IllegalStateException("Profile Tin nhắn button not visible")));
        try {
            button.click();
        } catch (Exception e) {
            LOGGER.warn("Native click failed on Tin nhắn — trying JS click", e);
            ((JavascriptExecutor) driver).executeScript("arguments[0].click();", button);
        }
        pace();
        try {
            WaitUtils.wait(driver, Duration.ofSeconds(25)).until(d -> {
                String url = d.getCurrentUrl();
                return url.contains("/messages") && url.contains("c=");
            });
        } catch (Exception e) {
            String notice = "";
            try {
                for (WebElement el : driver.findElements(profileNotice)) {
                    String t = el.getText();
                    if (t != null && (t.contains("h\u1ed9i tho\u1ea1i") || t.contains("h\u1ed3 s\u01a1"))) {
                        notice = t;
                        break;
                    }
                }
            } catch (Exception ignored) {
                // ignore
            }
            throw new IllegalStateException(
                    "Tin nhắn did not open a conversation. url=" + driver.getCurrentUrl()
                            + (notice.isBlank() ? "" : " notice=" + notice),
                    e);
        }
        WaitUtils.wait(driver, Duration.ofSeconds(15)).until(d -> !d.findElements(composerInput).isEmpty());
        return new MessagesPage(driver);
    }
}
