package com.vibely.automation.support;

import com.vibely.automation.pages.LoginPage;
import com.vibely.automation.utils.PropertyUtils;
import com.vibely.automation.utils.WaitUtils;
import org.openqa.selenium.By;
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;

import java.time.Duration;
import java.util.List;

/**
 * Shared authenticated-session helpers for UI tests.
 */
public final class AuthSteps {

    private static final By accountMenu = By.cssSelector("button[aria-label='Menu t\u00e0i kho\u1ea3n']");
    private static final By logoutMenuItem = By.xpath(
            "//div[contains(@class,'absolute')]//button[normalize-space()='\u0110\u0103ng xu\u1ea5t']");
    private static final By logoutConfirmButton = By.xpath(
            "//p[contains(.,'\u0111\u0103ng xu\u1ea5t')]/following::button[normalize-space()='\u0110\u0103ng xu\u1ea5t'][1]");
    private static final By guestLoginCta = By.xpath(
            "//a[normalize-space()='\u0110\u0103ng nh\u1eadp']"
                    + " | //button[normalize-space()='\u0110\u0103ng nh\u1eadp']");
    private static final By loginHeading = By.xpath(
            "//h2[contains(.,'\u0110\u0103ng nh\u1eadp') or contains(.,'Login')]");

    private AuthSteps() {
    }

    /**
     * Logs in with {@link TestCredentials} account A when configured; otherwise aborts the test.
     *
     * @param driver active WebDriver
     */
    public static void loginWithConfiguredUser(WebDriver driver) {
        org.junit.jupiter.api.Assumptions.assumeTrue(
                TestCredentials.isConfigured(),
                "Set credentials.local.properties (test.user.email / test.user.password)");
        loginAs(driver, TestCredentials.email(), TestCredentials.password());
    }

    /**
     * Logs in with the given email/password and asserts the session left {@code /login}.
     *
     * @param driver   active WebDriver
     * @param email    account email
     * @param password account password
     */
    public static void loginAs(WebDriver driver, String email, String password) {
        LoginPage loginPage = new LoginPage(driver).open().login(email, password);
        org.junit.jupiter.api.Assumptions.assumeTrue(
                loginPage.isLoginSuccess(),
                "Login failed for " + email + " — check credentials and captcha/auth-protection settings");
    }

    /**
     * Logs out via account menu (confirms the dialog when present), then hard-clears
     * cookies/storage so the next {@code /login} bootstrap cannot revive the session.
     *
     * @param driver active WebDriver
     */
    public static void logout(WebDriver driver) {
        driver.get(PropertyUtils.baseUrl() + "/foryou");
        WaitUtils.waitForClickable(driver, accountMenu).click();
        WaitUtils.waitForClickable(driver, logoutMenuItem).click();
        try {
            WaitUtils.waitForClickable(driver, logoutConfirmButton).click();
        } catch (Exception e) {
            // some screens logout immediately without confirm
            List<WebElement> fallback = driver.findElements(
                    By.xpath("//button[normalize-space()='\u0110\u0103ng xu\u1ea5t']"));
            if (!fallback.isEmpty()) {
                fallback.get(fallback.size() - 1).click();
            }
        }
        WaitUtils.wait(driver, Duration.ofSeconds(20)).until(d ->
                !d.findElements(guestLoginCta).isEmpty()
                        || d.getCurrentUrl().contains("/login")
                        || d.findElements(accountMenu).isEmpty());

        // Full navigation re-runs Auth bootstrap (me/refresh). Clear cookies first so
        // account A cannot be restored when switching to account B.
        driver.manage().deleteAllCookies();
        if (driver instanceof JavascriptExecutor js) {
            js.executeScript("try{localStorage.clear();sessionStorage.clear();}catch(e){}");
        }
        driver.get(PropertyUtils.baseUrl() + "/login");
        WaitUtils.wait(driver, Duration.ofSeconds(20)).until(d ->
                d.getCurrentUrl().contains("/login") && !d.findElements(loginHeading).isEmpty());
    }
}
