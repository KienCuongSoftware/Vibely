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
 * Vibely Studio upload page ({@code /vibelystudio/upload}).
 *
 * <p>File selection uses {@code input[type=file]} via {@link #selectVideo(String)} — do not click
 * "Chọn video" (native file picker is not controllable from Selenium).</p>
 */
public class UploadPage extends BasePage {

    private static final Logger LOGGER = LoggerFactory.getLogger(UploadPage.class);
    private static final Duration UPLOAD_READY_TIMEOUT = Duration.ofMinutes(3);

    private final By fileInput = By.cssSelector("input[type='file']");
    private final By pickVideoButton = By.xpath(
            "//button[normalize-space()='Ch\u1ecdn video' or contains(.,'Ch\u1ecdn video')]");
    private final By replaceButton = By.xpath(
            "//button[normalize-space()='Thay th\u1ebf' or contains(.,'Thay th\u1ebf')]");
    private final By descriptionInput = By.cssSelector(
            "textarea[placeholder*='Th\u00eam m\u00f4 t\u1ea3'], textarea[placeholder*='m\u00f4 t\u1ea3']");
    /** Exact enabled publish label after originality unlock. */
    private final By publishButton = By.xpath("//button[normalize-space()='\u0110\u0103ng']");
    private final By successToast = By.xpath(
            "//*[contains(.,'\u0110\u00e3 \u0111\u0103ng video th\u00e0nh c\u00f4ng')]");

    /** @param driver active WebDriver */
    public UploadPage(WebDriver driver) {
        super(driver);
    }

    /** Opens Studio upload (caller must already be logged in). */
    @Step("Open Studio upload page")
    public UploadPage open() {
        driver.get(PropertyUtils.baseUrl() + "/vibelystudio/upload");
        if (getCurrentUrl().contains("/login")) {
            throw new IllegalStateException(
                    "Upload requires login but session is on /login. Call AuthSteps.loginWithConfiguredUser first.");
        }
        WaitUtils.wait(driver, Duration.ofSeconds(20)).until(d ->
                !d.findElements(fileInput).isEmpty() || isDisplayed(pickVideoButton));
        LOGGER.info("Opened Studio upload at {}", getCurrentUrl());
        return this;
    }

    /**
     * Selects a local video file without opening the OS file dialog.
     *
     * @param absoluteVideoPath path to {@code .mp4} / {@code .mov} / {@code .webm}
     */
    @Step("Select video file")
    public UploadPage selectVideo(String absoluteVideoPath) {
        LOGGER.info("Selecting video file: {}", absoluteVideoPath);
        uploadFile(fileInput, absoluteVideoPath);
        WaitUtils.wait(driver, UPLOAD_READY_TIMEOUT).until(d ->
                isDisplayed(descriptionInput) || isDisplayed(replaceButton));
        LOGGER.info("Video selected — waiting for Đăng to become enabled...");
        waitUntilPublishEnabled();
        return this;
    }

    /** Fills the video description / caption. */
    @Step("Enter description: {0}")
    public UploadPage enterDescription(String description) {
        waitVisible(descriptionInput);
        type(descriptionInput, description == null ? "" : description);
        return this;
    }

    /** Clicks {@code Đăng} once the publish button is enabled. */
    @Step("Click publish (Đăng)")
    public UploadPage publish() {
        waitUntilPublishEnabled();
        click(publishButton);
        LOGGER.info("Clicked Đăng");
        return this;
    }

    /**
     * Full happy path: select file → caption → publish.
     *
     * @param absoluteVideoPath local video path
     * @param description       caption text
     */
    @Step("Upload and publish video")
    public UploadPage uploadAndPublish(String absoluteVideoPath, String description) {
        selectVideo(absoluteVideoPath);
        enterDescription(description);
        publish();
        return this;
    }

    /** Waits until navigation reaches Studio posts (or success toast). */
    @Step("Wait for publish success")
    public boolean isPublishSuccess() {
        try {
            WaitUtils.wait(driver, Duration.ofMinutes(2)).until(d ->
                    d.getCurrentUrl().contains("/vibelystudio/posts")
                            || !d.findElements(successToast).isEmpty());
            return getCurrentUrl().contains("/vibelystudio/posts") || isDisplayed(successToast);
        } catch (Exception e) {
            return getCurrentUrl().contains("/vibelystudio/posts") || isDisplayed(successToast);
        }
    }

    private void waitUntilPublishEnabled() {
        WaitUtils.wait(driver, UPLOAD_READY_TIMEOUT).until(d -> {
            for (WebElement button : d.findElements(publishButton)) {
                try {
                    if (button.isDisplayed() && button.isEnabled()) {
                        return true;
                    }
                } catch (Exception ignored) {
                    // stale while label flips Đang kiểm tra… → Đăng
                }
            }
            return false;
        });
    }
}
