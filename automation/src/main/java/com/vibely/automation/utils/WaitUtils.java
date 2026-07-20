package com.vibely.automation.utils;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;

/**
 * Provides explicit-wait helpers built on top of {@link WebDriverWait}, using the
 * {@code timeout} value configured in {@code config.properties}.
 */
public final class WaitUtils {

    private WaitUtils() {
    }

    private static Duration timeout() {
        return Duration.ofSeconds(PropertyUtils.timeoutSeconds());
    }

    /**
     * Creates a new {@link WebDriverWait} configured with the default timeout.
     *
     * @param driver the active {@link WebDriver}
     * @return a new {@link WebDriverWait}
     */
    public static WebDriverWait wait(WebDriver driver) {
        return new WebDriverWait(driver, timeout());
    }

    /**
     * Creates a {@link WebDriverWait} with a custom timeout (e.g. long upload / originality checks).
     *
     * @param driver  the active {@link WebDriver}
     * @param timeout how long to wait
     * @return a new {@link WebDriverWait}
     */
    public static WebDriverWait wait(WebDriver driver, Duration timeout) {
        return new WebDriverWait(driver, timeout);
    }

    /**
     * Waits until the element located by {@code locator} is visible.
     *
     * @param driver  the active {@link WebDriver}
     * @param locator the element locator
     * @return the visible {@link WebElement}
     */
    public static WebElement waitForVisible(WebDriver driver, By locator) {
        return wait(driver).until(ExpectedConditions.visibilityOfElementLocated(locator));
    }

    /**
     * Waits until the given element is visible.
     *
     * @param driver  the active {@link WebDriver}
     * @param element the element to wait on
     * @return the visible {@link WebElement}
     */
    public static WebElement waitForVisible(WebDriver driver, WebElement element) {
        return wait(driver).until(ExpectedConditions.visibilityOf(element));
    }

    /**
     * Waits until the element located by {@code locator} is clickable.
     *
     * @param driver  the active {@link WebDriver}
     * @param locator the element locator
     * @return the clickable {@link WebElement}
     */
    public static WebElement waitForClickable(WebDriver driver, By locator) {
        return wait(driver).until(ExpectedConditions.elementToBeClickable(locator));
    }

    /**
     * Waits until the given element is clickable.
     *
     * @param driver  the active {@link WebDriver}
     * @param element the element to wait on
     * @return the clickable {@link WebElement}
     */
    public static WebElement waitForClickable(WebDriver driver, WebElement element) {
        return wait(driver).until(ExpectedConditions.elementToBeClickable(element));
    }

    /**
     * Waits until the element located by {@code locator} is invisible or absent from the DOM.
     *
     * @param driver  the active {@link WebDriver}
     * @param locator the element locator
     * @return {@code true} once the element is invisible
     */
    public static boolean waitForInvisible(WebDriver driver, By locator) {
        return wait(driver).until(ExpectedConditions.invisibilityOfElementLocated(locator));
    }

    /**
     * Waits until the given element is invisible or removed from the DOM.
     *
     * @param driver  the active {@link WebDriver}
     * @param element the element to wait on
     * @return {@code true} once the element is invisible
     */
    public static boolean waitForInvisible(WebDriver driver, WebElement element) {
        return wait(driver).until(ExpectedConditions.invisibilityOf(element));
    }

    /**
     * Waits until the current URL contains the given fragment.
     *
     * @param driver   the active {@link WebDriver}
     * @param fragment the expected URL fragment
     * @return {@code true} once the URL contains {@code fragment}
     */
    public static boolean waitForUrlContains(WebDriver driver, String fragment) {
        return wait(driver).until(ExpectedConditions.urlContains(fragment));
    }

    /**
     * Waits until the current page title contains the given fragment.
     *
     * @param driver   the active {@link WebDriver}
     * @param fragment the expected title fragment
     * @return {@code true} once the title contains {@code fragment}
     */
    public static boolean waitForTitleContains(WebDriver driver, String fragment) {
        return wait(driver).until(ExpectedConditions.titleContains(fragment));
    }

    /**
     * Waits until the number of open browser windows/tabs equals {@code expectedCount}.
     *
     * @param driver        the active {@link WebDriver}
     * @param expectedCount the expected number of windows
     * @return {@code true} once the window count matches
     */
    public static boolean waitForNumberOfWindows(WebDriver driver, int expectedCount) {
        return wait(driver).until(ExpectedConditions.numberOfWindowsToBe(expectedCount));
    }
}
