package com.vibely.automation.pages;

import com.vibely.automation.base.BasePage;
import com.vibely.automation.utils.PropertyUtils;
import com.vibely.automation.utils.WaitUtils;
import io.qameta.allure.Step;
import org.openqa.selenium.By;
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.Keys;
import org.openqa.selenium.TimeoutException;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Duration;
import java.util.List;

/**
 * Authenticated For You feed ({@code /foryou}) with like / follow / comment / bookmark actions.
 */
public class FeedPage extends BasePage {

    private static final Logger LOGGER = LoggerFactory.getLogger(FeedPage.class);

    private final By likeButton = By.cssSelector("button[aria-label='Th\u00edch'], button[aria-label='B\u1ecf th\u00edch']");
    private final By commentButton = By.cssSelector(
            "button[data-testid='feed-comment-button'], button[aria-label='B\u00ecnh lu\u1eadn']");
    private final By bookmarkButton = By.cssSelector(
            "button[aria-label='L\u01b0u y\u00eau th\u00edch'], button[aria-label='B\u1ecf l\u01b0u y\u00eau th\u00edch']");
    private final By followBadge = By.cssSelector("button[aria-label^='Theo d\u00f5i ']");
    private final By nextVideoButton = By.cssSelector("button[aria-label='Video ti\u1ebfp theo']");
    private final By commentsPanel = By.cssSelector(
            "aside[data-testid='feed-comments-panel'], aside[aria-label='B\u00ecnh lu\u1eadn']");
    private final By commentInput = By.cssSelector(
            "input[data-testid='feed-comment-input'], "
                    + "aside[data-testid='feed-comments-panel'] input[type='text'], "
                    + "aside[aria-label='B\u00ecnh lu\u1eadn'] input[type='text'], "
                    + "input[placeholder*='Th\u00eam b\u00ecnh lu\u1eadn'], "
                    + "textarea[placeholder*='Th\u00eam b\u00ecnh lu\u1eadn']");
    private final By sendCommentButton = By.cssSelector(
            "button[data-testid='feed-comment-send'], button[aria-label='G\u1eedi b\u00ecnh lu\u1eadn']");
    private final By commentRestrictedNotice = By.xpath(
            "//aside[@data-testid='feed-comments-panel' or @aria-label='B\u00ecnh lu\u1eadn']"
                    + "//*[contains(.,'gi\u1edbi h\u1ea1n quy\u1ec1n')]");
    private final By favoriteToast = By.xpath(
            "//*[contains(.,'\u0110\u00e3 th\u00eam v\u00e0o M\u1ee5c y\u00eau th\u00edch')]");

    /** @param driver active WebDriver */
    public FeedPage(WebDriver driver) {
        super(driver);
    }

    /** Opens For You. */
    @Step("Open For You feed")
    public FeedPage open() {
        driver.get(PropertyUtils.baseUrl() + "/foryou");
        if (getCurrentUrl().contains("/login")) {
            throw new IllegalStateException("For You requires login but session is on /login.");
        }
        WaitUtils.wait(driver, Duration.ofSeconds(30)).until(d ->
                !d.findElements(likeButton).isEmpty() || !d.findElements(commentButton).isEmpty());
        LOGGER.info("Opened For You at {}", getCurrentUrl());
        return this;
    }

    /** Scrolls to the next video when the control is available. */
    @Step("Scroll to next video")
    public FeedPage nextVideo() {
        if (isDisplayed(nextVideoButton)) {
            click(nextVideoButton);
            WaitUtils.wait(driver, Duration.ofSeconds(5)).until(d -> !d.findElements(likeButton).isEmpty());
        } else {
            driver.switchTo().activeElement().sendKeys(Keys.ARROW_DOWN);
        }
        return this;
    }

    /** Toggles like on the active video (clicks Thích if not already liked). */
    @Step("Like active video")
    public FeedPage like() {
        WebElement button = waitClickable(likeButton);
        String label = String.valueOf(button.getAttribute("aria-label"));
        if (label.contains("B\u1ecf th\u00edch")) {
            LOGGER.info("Video already liked — skipping");
            return this;
        }
        button.click();
        pace();
        LOGGER.info("Liked active video");
        return this;
    }

    /**
     * Follows the active video's author when the {@code +} badge is shown.
     * No-op when already following or when viewing own content.
     */
    @Step("Follow active video author if needed")
    public FeedPage followAuthorIfNeeded() {
        if (!isDisplayed(followBadge)) {
            LOGGER.info("Follow badge not shown — already following or own video");
            return this;
        }
        click(followBadge);
        LOGGER.info("Followed active video author");
        return this;
    }

    /** Opens the comment panel, posts a comment, and leaves the dock open or closed. */
    @Step("Comment on active video: {0}")
    public FeedPage comment(String text) {
        openCommentsPanel();
        if (!driver.findElements(commentRestrictedNotice).isEmpty()) {
            throw new IllegalStateException(
                    "Cannot comment: creator restricted comments on this video.");
        }
        WaitUtils.wait(driver, Duration.ofSeconds(15)).until(d -> visibleCommentInput(d) != null);
        WebElement input = visibleCommentInput(driver);
        if (input == null) {
            throw new TimeoutException("Comment input not visible after opening comments panel.");
        }
        input.click();
        input.clear();
        input.sendKeys(text == null ? "" : text);
        pace();
        WaitUtils.wait(driver, Duration.ofSeconds(10)).until(d -> {
            for (WebElement send : d.findElements(sendCommentButton)) {
                try {
                    return send.isDisplayed() && send.isEnabled();
                } catch (Exception ignored) {
                    return false;
                }
            }
            return false;
        });
        click(sendCommentButton);
        LOGGER.info("Posted comment");
        return this;
    }

    /** Saves the active video to favorites if not already bookmarked. */
    @Step("Save active video to favorites")
    public FeedPage saveToFavorites() {
        WebElement button = waitClickable(bookmarkButton);
        String label = String.valueOf(button.getAttribute("aria-label"));
        if (label.contains("B\u1ecf l\u01b0u")) {
            LOGGER.info("Video already in favorites — skipping");
            return this;
        }
        button.click();
        pace();
        try {
            WaitUtils.wait(driver, Duration.ofSeconds(5)).until(d -> !d.findElements(favoriteToast).isEmpty());
        } catch (Exception ignored) {
            // toast is best-effort
        }
        LOGGER.info("Saved video to favorites");
        return this;
    }

    /**
     * Scrolls once (if possible), then likes, follows (when shown), comments, and bookmarks.
     */
    @Step("Engage with feed video")
    public FeedPage engageWithActiveVideo(String commentText) {
        nextVideo();
        pace();
        like();
        followAuthorIfNeeded();
        comment(commentText);
        saveToFavorites();
        return this;
    }

    private void openCommentsPanel() {
        if (isCommentsPanelReady()) {
            return;
        }
        WebElement button = waitClickable(commentButton);
        clickCommentToggle(button);
        try {
            WaitUtils.wait(driver, Duration.ofSeconds(8)).until(d -> isCommentsPanelReady());
            return;
        } catch (TimeoutException first) {
            LOGGER.warn("Comments panel did not open after native click — retrying with JS click");
        }
        List<WebElement> buttons = driver.findElements(commentButton);
        WebElement retry = buttons.isEmpty() ? button : buttons.get(buttons.size() - 1);
        clickCommentToggle(retry);
        WaitUtils.wait(driver, Duration.ofSeconds(10)).until(d -> isCommentsPanelReady());
    }

    private void clickCommentToggle(WebElement button) {
        try {
            String expanded = String.valueOf(button.getAttribute("aria-expanded"));
            if ("true".equalsIgnoreCase(expanded) && isCommentsPanelReady()) {
                return;
            }
            button.click();
        } catch (Exception nativeClickFailed) {
            ((JavascriptExecutor) driver).executeScript("arguments[0].click();", button);
        }
        pace();
    }

    private boolean isCommentsPanelReady() {
        if (driver.findElements(commentsPanel).isEmpty()) {
            return false;
        }
        if (!driver.findElements(commentRestrictedNotice).isEmpty()) {
            return true;
        }
        return visibleCommentInput(driver) != null;
    }

    private static WebElement visibleCommentInput(WebDriver driver) {
        By inputLocator = By.cssSelector(
                "input[data-testid='feed-comment-input'], "
                        + "aside[data-testid='feed-comments-panel'] input[type='text'], "
                        + "aside[aria-label='B\u00ecnh lu\u1eadn'] input[type='text'], "
                        + "input[placeholder*='Th\u00eam b\u00ecnh lu\u1eadn'], "
                        + "textarea[placeholder*='Th\u00eam b\u00ecnh lu\u1eadn']");
        for (WebElement el : driver.findElements(inputLocator)) {
            try {
                if (el.isDisplayed()) {
                    return el;
                }
            } catch (Exception ignored) {
                // stale
            }
        }
        return null;
    }
}
