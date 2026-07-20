package com.vibely.automation.pages;

import com.vibely.automation.base.BasePage;
import com.vibely.automation.utils.PropertyUtils;
import com.vibely.automation.utils.WaitUtils;
import io.qameta.allure.Step;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.support.ui.ExpectedConditions;

/**
 * Vibely login page ({@code /login}).
 *
 * <p>UI is multi-step: method picker first, then email/password form. Automation always enters the
 * credentials view before typing.</p>
 */
public class LoginPage extends BasePage {

    // Unicode escapes keep source encoding-safe on Windows toolchains.
    private final By anyLoginHeading = By.xpath(
            "//h2[contains(.,'\u0110\u0103ng nh\u1eadp') or contains(.,'Login')]");
    private final By useEmailMethodButton = By.xpath(
            "//button[contains(.,'D\u00f9ng email') or contains(.,'email / username')"
                    + " or contains(.,'Email / username')]");
    private final By identifierInput = By.cssSelector(
            "input[placeholder*='Email'], input[placeholder*='ng\u01b0\u1eddi d\u00f9ng']");
    private final By passwordInput = By.cssSelector("form input[type='password']");
    private final By loginButton = By.cssSelector("form button[type='submit']");
    private final By forgotPasswordLink = By.xpath(
            "//button[contains(.,'Qu\u00ean m\u1eadt kh\u1ea9u') or contains(.,'Forgot')]");
    private final By registerLink = By.xpath(
            "//a[contains(.,'\u0110\u0103ng k\u00fd') or contains(.,'Sign up')]"
                    + " | //button[contains(.,'\u0110\u0103ng k\u00fd')]");
    private final By statusMessage = By.cssSelector("p.text-center, p[class*='text-red'], [role='alert']");

    /**
     * @param driver active WebDriver
     */
    public LoginPage(WebDriver driver) {
        super(driver);
    }

    /** Opens the login page and lands on the credentials form. */
    @Step("Open login page")
    public LoginPage open() {
        driver.get(PropertyUtils.baseUrl() + "/login");
        // Auth bootstrap shows a blank shell until authReady — wait past that.
        WaitUtils.wait(driver, java.time.Duration.ofSeconds(25))
                .until(d -> !d.findElements(anyLoginHeading).isEmpty()
                        || !d.findElements(useEmailMethodButton).isEmpty()
                        || !d.findElements(identifierInput).isEmpty());
        openCredentialsForm();
        return this;
    }

    /**
     * From the method picker, clicks email/username so password fields appear.
     * No-op when already on the credentials view.
     */
    @Step("Open email/password credentials form")
    public LoginPage openCredentialsForm() {
        if (isDisplayed(identifierInput) && isDisplayed(passwordInput)) {
            return this;
        }
        if (isDisplayed(useEmailMethodButton)) {
            click(useEmailMethodButton);
        }
        waitVisible(identifierInput);
        waitVisible(passwordInput);
        return this;
    }

    /** Types the email or username. */
    @Step("Enter email/username: {0}")
    public LoginPage enterEmail(String emailOrUsername) {
        openCredentialsForm();
        type(identifierInput, emailOrUsername);
        return this;
    }

    /** Types the password. */
    @Step("Enter password")
    public LoginPage enterPassword(String password) {
        openCredentialsForm();
        type(passwordInput, password);
        return this;
    }

    /** Clicks the login submit button. */
    @Step("Click login")
    public LoginPage clickLogin() {
        openCredentialsForm();
        click(loginButton);
        return this;
    }

    /** Opens forgot-password flow. */
    @Step("Click forgot password")
    public LoginPage clickForgotPassword() {
        openCredentialsForm();
        click(forgotPasswordLink);
        return this;
    }

    /** Navigates to register. */
    @Step("Click register")
    public LoginPage clickRegister() {
        click(registerLink);
        return this;
    }

    /** Performs a full credential login. */
    @Step("Login as {0}")
    public LoginPage login(String email, String password) {
        openCredentialsForm();
        enterEmail(email);
        enterPassword(password);
        clickLogin();
        return this;
    }

    /** Returns visible error / status text. */
    @Step("Get login error message")
    public String getErrorMessage() {
        if (!isDisplayed(statusMessage)) {
            return "";
        }
        return getText(statusMessage);
    }

    /** Returns {@code true} when navigation leaves {@code /login}. */
    @Step("Verify login success")
    public boolean isLoginSuccess() {
        try {
            WaitUtils.wait(driver).until(ExpectedConditions.not(ExpectedConditions.urlContains("/login")));
            return true;
        } catch (Exception e) {
            return !getCurrentUrl().contains("/login");
        }
    }
}
