package com.vibely.automation.pages;

import com.vibely.automation.base.BasePage;
import com.vibely.automation.utils.PropertyUtils;
import com.vibely.automation.utils.WaitUtils;
import io.qameta.allure.Step;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Duration;

/**
 * Direct messages inbox ({@code /messages}), including message-request accept.
 */
public class MessagesPage extends BasePage {

    private static final Logger LOGGER = LoggerFactory.getLogger(MessagesPage.class);

    private final By requestsEntry = By.xpath(
            "//button[.//p[normalize-space()='Y\u00eau c\u1ea7u tin nh\u1eafn']]"
                    + " | //p[normalize-space()='Y\u00eau c\u1ea7u tin nh\u1eafn']/ancestor::button[1]");
    private final By acceptButton = By.xpath("//button[normalize-space()='Ch\u1ea5p nh\u1eadn']");
    private final By composerInput = By.cssSelector("input[placeholder='Nh\u1eadp tin nh\u1eafn...']");
    private final By sendButton = By.cssSelector("form button[type='submit']");

    /** @param driver active WebDriver */
    public MessagesPage(WebDriver driver) {
        super(driver);
    }

    /** Opens the messages inbox. */
    @Step("Open messages")
    public MessagesPage open() {
        driver.get(PropertyUtils.baseUrl() + "/messages");
        WaitUtils.wait(driver, Duration.ofSeconds(20)).until(d -> d.getCurrentUrl().contains("/messages"));
        pace();
        return this;
    }

    /** Opens the message-requests list when the inbox entry is present. */
    @Step("Open message requests")
    public MessagesPage openMessageRequests() {
        if (isDisplayed(requestsEntry)) {
            click(requestsEntry);
            pace();
        } else {
            LOGGER.info("Message-requests entry not shown — continuing in normal inbox");
        }
        return this;
    }

    /** Selects a conversation whose list row contains {@code peerHint} (username, display name, or preview). */
    @Step("Open conversation with: {0}")
    public MessagesPage openConversationWith(String peerHint) {
        String hint = peerHint == null ? "" : peerHint.trim().replace("@", "");
        By byHint = By.xpath(
                "//div[contains(@class,'cursor-pointer') and contains(@class,'border-b')]"
                        + "[.//p[contains(translate(.,"
                        + "'ABCDEFGHIJKLMNOPQRSTUVWXYZÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ"
                        + "',"
                        + "'abcdefghijklmnopqrstuvwxyzàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ'"
                        + "),'"
                        + hint.toLowerCase()
                        + "')]]");
        By byFirstRequest = By.xpath(
                "//div[contains(@class,'cursor-pointer') and contains(@class,'border-b')]"
                        + "[.//img][.//p[contains(@class,'font-semibold')]"
                        + "[not(contains(.,'Ch\u01b0a c\u00f3 tin nh\u1eafn'))]]");
        try {
            WaitUtils.wait(driver, Duration.ofSeconds(8)).until(d -> !d.findElements(byHint).isEmpty());
            click(byHint);
        } catch (Exception e) {
            LOGGER.info("No row matched hint '{}' — opening first conversation in list", hint);
            WaitUtils.wait(driver, Duration.ofSeconds(20)).until(d -> !d.findElements(byFirstRequest).isEmpty());
            click(byFirstRequest);
        }
        pace();
        return this;
    }

    /**
     * Clicks {@code Chấp nhận} when the message-request bar is shown.
     * No-op if already accepted / mutual chat.
     */
    @Step("Accept message request if shown")
    public MessagesPage acceptRequestIfNeeded() {
        try {
            WaitUtils.wait(driver, Duration.ofSeconds(5)).until(d -> !d.findElements(acceptButton).isEmpty());
        } catch (Exception e) {
            LOGGER.info("Chấp nhận not shown — request already accepted or not needed");
            return this;
        }
        if (isDisplayed(acceptButton)) {
            click(acceptButton);
            WaitUtils.wait(driver, Duration.ofSeconds(15)).until(d -> !d.findElements(composerInput).isEmpty());
            LOGGER.info("Accepted message request");
        }
        return this;
    }

    /** Types and sends a chat message when the composer is enabled. */
    @Step("Send message: {0}")
    public MessagesPage sendMessage(String text) {
        WaitUtils.wait(driver, Duration.ofSeconds(20)).until(d -> {
            for (WebElement input : d.findElements(composerInput)) {
                try {
                    return input.isDisplayed();
                } catch (Exception ignored) {
                    return false;
                }
            }
            return false;
        });
        WebElement input = waitVisible(composerInput);
        if (!input.isEnabled()) {
            LOGGER.info("Composer disabled (likely already sent message-request quota) — skip send");
            return this;
        }
        type(composerInput, text == null ? "" : text);
        click(sendButton);
        LOGGER.info("Sent message");
        return this;
    }

    /**
     * {@code true} when the composer is visible and enabled for sending.
     * Disabled composer means a pending request already used the 1-message quota.
     */
    public boolean isComposerReady() {
        try {
            WebElement input = waitVisible(composerInput);
            return input.isDisplayed() && input.isEnabled();
        } catch (Exception e) {
            return false;
        }
    }

    /** {@code true} when a conversation is open ({@code ?c=} in the URL). */
    public boolean hasActiveConversation() {
        return driver.getCurrentUrl().contains("c=");
    }
}
