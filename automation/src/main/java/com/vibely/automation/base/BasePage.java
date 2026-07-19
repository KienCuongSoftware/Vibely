package com.vibely.automation.base;

import com.vibely.automation.utils.WaitUtils;
import org.openqa.selenium.Alert;
import org.openqa.selenium.By;
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.Keys;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.interactions.Actions;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;
import java.util.ArrayList;
import java.util.List;

/**
 * Base class for all Page Object classes.
 *
 * <p>Provides a reusable set of common Selenium interactions (click, type, waits, navigation,
 * alerts, tabs, JavaScript execution, etc.) so that concrete page objects can focus purely on
 * page-specific locators and business flows.</p>
 *
 * <p>All interactions rely on {@link WaitUtils} for explicit waits and never use
 * {@code Thread.sleep}. Failures are surfaced as clear, descriptive exceptions.</p>
 */
public abstract class BasePage {

    private static final Logger LOGGER = LoggerFactory.getLogger(BasePage.class);

    protected final WebDriver driver;

    /**
     * Creates a new page object bound to the given driver instance.
     *
     * @param driver the active {@link WebDriver} session to operate on; must not be {@code null}
     */
    protected BasePage(WebDriver driver) {
        if (driver == null) {
            throw new IllegalArgumentException("WebDriver must not be null");
        }
        this.driver = driver;
    }

    /**
     * Clicks the element located by {@code locator} once it is clickable.
     *
     * @param locator the element locator
     */
    public void click(By locator) {
        try {
            waitClickable(locator).click();
            LOGGER.debug("Clicked element: {}", locator);
        } catch (Exception e) {
            throw new BasePageActionException("Failed to click element: " + locator, e);
        }
    }

    /**
     * Types the given text into the element located by {@code locator}, clearing any existing
     * value first.
     *
     * @param locator the element locator
     * @param text    the text to type
     */
    public void type(By locator, String text) {
        try {
            WebElement element = waitVisible(locator);
            element.clear();
            element.sendKeys(text);
            LOGGER.debug("Typed into element {}: '{}'", locator, text);
        } catch (Exception e) {
            throw new BasePageActionException("Failed to type into element: " + locator, e);
        }
    }

    /**
     * Clears the current value of the element located by {@code locator}.
     *
     * @param locator the element locator
     */
    public void clear(By locator) {
        try {
            waitVisible(locator).clear();
        } catch (Exception e) {
            throw new BasePageActionException("Failed to clear element: " + locator, e);
        }
    }

    /**
     * Returns the visible text of the element located by {@code locator}.
     *
     * @param locator the element locator
     * @return the visible text
     */
    public String getText(By locator) {
        try {
            return waitVisible(locator).getText();
        } catch (Exception e) {
            throw new BasePageActionException("Failed to get text from element: " + locator, e);
        }
    }

    /**
     * Returns the value of the given attribute of the element located by {@code locator}.
     *
     * @param locator       the element locator
     * @param attributeName the attribute name (e.g. {@code value}, {@code class})
     * @return the attribute value, or {@code null} if the attribute is not present
     */
    public String getAttribute(By locator, String attributeName) {
        try {
            return waitVisible(locator).getAttribute(attributeName);
        } catch (Exception e) {
            throw new BasePageActionException(
                    "Failed to get attribute '" + attributeName + "' from element: " + locator, e);
        }
    }

    /**
     * Scrolls the element located by {@code locator} into the visible viewport.
     *
     * @param locator the element locator
     */
    public void scrollIntoView(By locator) {
        WebElement element = waitVisible(locator);
        executeJavaScript("arguments[0].scrollIntoView({block: 'center', inline: 'center'});", element);
    }

    /**
     * Scrolls the page to the very top.
     */
    public void scrollToTop() {
        executeJavaScript("window.scrollTo(0, 0);");
    }

    /**
     * Scrolls the page to the very bottom.
     */
    public void scrollToBottom() {
        executeJavaScript("window.scrollTo(0, document.body.scrollHeight);");
    }

    /**
     * Hovers the mouse pointer over the element located by {@code locator}.
     *
     * @param locator the element locator
     */
    public void hover(By locator) {
        WebElement element = waitVisible(locator);
        new Actions(driver).moveToElement(element).perform();
    }

    /**
     * Performs a double-click on the element located by {@code locator}.
     *
     * @param locator the element locator
     */
    public void doubleClick(By locator) {
        WebElement element = waitClickable(locator);
        new Actions(driver).doubleClick(element).perform();
    }

    /**
     * Performs a right-click (context click) on the element located by {@code locator}.
     *
     * @param locator the element locator
     */
    public void rightClick(By locator) {
        WebElement element = waitClickable(locator);
        new Actions(driver).contextClick(element).perform();
    }

    /**
     * Sends the {@code ENTER} key to the element located by {@code locator}.
     *
     * @param locator the element locator
     */
    public void pressEnter(By locator) {
        waitVisible(locator).sendKeys(Keys.ENTER);
    }

    /**
     * Sends the {@code ESCAPE} key to the element located by {@code locator}.
     *
     * @param locator the element locator
     */
    public void pressEscape(By locator) {
        waitVisible(locator).sendKeys(Keys.ESCAPE);
    }

    /**
     * Waits until the element located by {@code locator} is visible and returns it.
     *
     * @param locator the element locator
     * @return the visible {@link WebElement}
     */
    public WebElement waitVisible(By locator) {
        return WaitUtils.waitForVisible(driver, locator);
    }

    /**
     * Waits until the element located by {@code locator} is clickable and returns it.
     *
     * @param locator the element locator
     * @return the clickable {@link WebElement}
     */
    public WebElement waitClickable(By locator) {
        return WaitUtils.waitForClickable(driver, locator);
    }

    /**
     * Waits until the element located by {@code locator} becomes invisible or is removed from
     * the DOM.
     *
     * @param locator the element locator
     * @return {@code true} once the element is invisible
     */
    public boolean waitInvisible(By locator) {
        return WaitUtils.waitForInvisible(driver, locator);
    }

    /**
     * Checks whether the element located by {@code locator} is currently displayed.
     *
     * @param locator the element locator
     * @return {@code true} if the element exists and is displayed, {@code false} otherwise
     */
    public boolean isDisplayed(By locator) {
        try {
            return driver.findElement(locator).isDisplayed();
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Checks whether the element located by {@code locator} is currently enabled.
     *
     * @param locator the element locator
     * @return {@code true} if the element exists and is enabled, {@code false} otherwise
     */
    public boolean isEnabled(By locator) {
        try {
            return driver.findElement(locator).isEnabled();
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Checks whether the element located by {@code locator} is currently selected (checkboxes,
     * radio buttons, options).
     *
     * @param locator the element locator
     * @return {@code true} if the element exists and is selected, {@code false} otherwise
     */
    public boolean isSelected(By locator) {
        try {
            return driver.findElement(locator).isSelected();
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Uploads a local file by sending its absolute path to the file input element located by
     * {@code locator}.
     *
     * @param locator  the file input element locator
     * @param filePath the path of the file to upload
     */
    public void uploadFile(By locator, String filePath) {
        File file = new File(filePath);
        if (!file.exists()) {
            throw new IllegalArgumentException("File to upload does not exist: " + filePath);
        }
        driver.findElement(locator).sendKeys(file.getAbsolutePath());
    }

    /**
     * Executes the given JavaScript snippet in the context of the current page.
     *
     * @param script the JavaScript to execute
     * @param args   optional arguments made available to the script as {@code arguments[n]}
     * @param <T>    the expected return type
     * @return the value returned by the script, or {@code null}
     */
    @SuppressWarnings("unchecked")
    public <T> T executeJavaScript(String script, Object... args) {
        return (T) ((JavascriptExecutor) driver).executeScript(script, args);
    }

    /**
     * Refreshes the current page.
     */
    public void refresh() {
        driver.navigate().refresh();
    }

    /**
     * Navigates back in the browser history.
     */
    public void back() {
        driver.navigate().back();
    }

    /**
     * Navigates forward in the browser history.
     */
    public void forward() {
        driver.navigate().forward();
    }

    /**
     * Switches focus to the browser tab/window at the given index (0-based, in the order
     * reported by {@link WebDriver#getWindowHandles()}).
     *
     * @param index the zero-based tab index to switch to
     */
    public void switchTab(int index) {
        List<String> handles = new ArrayList<>(driver.getWindowHandles());
        if (index < 0 || index >= handles.size()) {
            throw new IndexOutOfBoundsException(
                    "No tab found at index " + index + ". Open tabs: " + handles.size());
        }
        driver.switchTo().window(handles.get(index));
    }

    /**
     * Closes the currently focused tab/window and, if any tabs remain open, switches focus to
     * the first remaining one.
     */
    public void closeCurrentTab() {
        String currentHandle = driver.getWindowHandle();
        List<String> handles = new ArrayList<>(driver.getWindowHandles());
        driver.close();
        handles.remove(currentHandle);
        if (!handles.isEmpty()) {
            driver.switchTo().window(handles.get(0));
        }
    }

    /**
     * Accepts the currently displayed JavaScript alert.
     */
    public void acceptAlert() {
        Alert alert = driver.switchTo().alert();
        alert.accept();
    }

    /**
     * Dismisses the currently displayed JavaScript alert.
     */
    public void dismissAlert() {
        Alert alert = driver.switchTo().alert();
        alert.dismiss();
    }

    /**
     * Returns the current page URL.
     *
     * @return the current URL
     */
    public String getCurrentUrl() {
        return driver.getCurrentUrl();
    }

    /**
     * Returns the current page title.
     *
     * @return the page title
     */
    public String getTitle() {
        return driver.getTitle();
    }

    /**
     * Runtime exception thrown when a {@link BasePage} action fails, wrapping the root cause
     * with additional context about the attempted action.
     */
    public static class BasePageActionException extends RuntimeException {
        public BasePageActionException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
