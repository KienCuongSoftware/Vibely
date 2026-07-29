package com.vibely.automation.pages;

import com.vibely.automation.base.BasePage;
import com.vibely.automation.utils.PropertyUtils;
import com.vibely.automation.utils.WaitUtils;
import io.qameta.allure.Step;
import org.openqa.selenium.By;
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;

import java.time.Duration;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Vibely signup page ({@code /signup}).
 *
 * <p>Flow: method picker → email credentials (DOB + email/password/OTP) → Vibely ID.</p>
 */
public class SignupPage extends BasePage {

    private static final Pattern SIX_DIGIT_CODE = Pattern.compile("(?<!\\d)(\\d{6})(?!\\d)");

    private static final String[] MONTH_LABELS = {
            "Th\u00e1ng M\u1ed9t",
            "Th\u00e1ng Hai",
            "Th\u00e1ng Ba",
            "Th\u00e1ng T\u01b0",
            "Th\u00e1ng N\u0103m",
            "Th\u00e1ng S\u00e1u",
            "Th\u00e1ng B\u1ea3y",
            "Th\u00e1ng T\u00e1m",
            "Th\u00e1ng Ch\u00edn",
            "Th\u00e1ng M\u01b0\u1eddi",
            "Th\u00e1ng M\u01b0\u1eddi M\u1ed9t",
            "Th\u00e1ng M\u01b0\u1eddi Hai",
    };

    private final By signupHeading = By.xpath(
            "//h2[contains(.,'\u0110\u0103ng k\u00fd') or contains(.,'Sign up') or contains(.,'Signup')]");
    private final By useEmailMethodButton = By.xpath(
            "//button[contains(.,'S\u1eed d\u1ee5ng email') or contains(.,'Use email')"
                    + " or contains(.,'email /')]");
    private final By birthPrompt = By.xpath(
            "//p[contains(.,'ng\u00e0y sinh') or contains(.,'date of birth')]");
    private final By monthTrigger = By.cssSelector("button[aria-label='Ch\u1ecdn th\u00e1ng sinh']");
    private final By dayTrigger = By.cssSelector("button[aria-label='Ch\u1ecdn ng\u00e0y sinh']");
    private final By yearTrigger = By.cssSelector("button[aria-label='Ch\u1ecdn n\u0103m sinh']");
    private final By emailInput = By.cssSelector(
            "input[placeholder*='\u0110\u1ecba ch\u1ec9 email'], input[placeholder*='email' i]");
    private final By passwordInput = By.cssSelector(
            "input[placeholder*='M\u1eadt kh\u1ea9u'], input[placeholder*='Password' i], input[type='password']");
    private final By otpInput = By.cssSelector(
            "input[placeholder*='6'], input[placeholder*='m\u00e3']");
    private final By sendCodeButton = By.xpath(
            "//button[contains(.,'G\u1eedi m\u00e3') or contains(.,'G\u1eedi l\u1ea1i')"
                    + " or contains(.,'Send') or contains(.,'\u0110ang g\u1eedi')]");
    private final By nextButton = By.xpath(
            "//button[@type='submit' and (normalize-space()='Ti\u1ebfp' or contains(.,'Next')"
                    + " or contains(.,'Continue'))]");
    private final By registerButton = By.xpath(
            "//button[@type='submit' and (normalize-space()='\u0110\u0103ng k\u00fd'"
                    + " or contains(.,'Sign up') or contains(.,'Register'))]");
    private final By vibelyIdInput = By.cssSelector(
            "input[placeholder='your.id'], input[placeholder*='Vibely'], input[placeholder*='id' i]");
    private final By statusMessage = By.cssSelector("p.text-center, p[class*='text-red'], [role='alert']");
    private final By emailStatus = By.xpath(
            "//p[contains(.,'Email') or contains(.,'email')]");
    private final By usernameStatus = By.xpath(
            "//p[contains(.,'Vibely ID') or contains(.,'ID')]");
    private final By captchaChallenge = By.xpath(
            "//*[contains(@class,'challenge') or contains(.,'X\u00e1c minh')]"
                    + "[contains(.,'xoay') or contains(.,'captcha') or contains(.,'Captcha')"
                    + " or contains(.,'Verify')]");
    private final By loginLink = By.xpath(
            "//a[contains(.,'\u0110\u0103ng nh\u1eadp') or contains(.,'Log in')"
                    + " or contains(.,'Login')]");

    /** @param driver active WebDriver */
    public SignupPage(WebDriver driver) {
        super(driver);
    }

    /** Opens {@code /signup} and lands on the email credentials form. */
    @Step("Open signup page")
    public SignupPage open() {
        driver.get(PropertyUtils.baseUrl() + "/signup");
        WaitUtils.wait(driver, Duration.ofSeconds(25))
                .until(d -> !d.findElements(signupHeading).isEmpty()
                        || !d.findElements(useEmailMethodButton).isEmpty()
                        || !d.findElements(emailInput).isEmpty());
        openCredentialsForm();
        return this;
    }

    /** From the method picker, opens the email signup form. No-op when already there. */
    @Step("Open email credentials form")
    public SignupPage openCredentialsForm() {
        if (isDisplayed(emailInput) && isDisplayed(passwordInput)) {
            return this;
        }
        if (isDisplayed(useEmailMethodButton)) {
            click(useEmailMethodButton);
        }
        waitVisible(emailInput);
        waitVisible(passwordInput);
        return this;
    }

    /** Returns {@code true} when DOB + credential fields are visible. */
    @Step("Verify credentials form visible")
    public boolean isCredentialsFormVisible() {
        return isDisplayed(birthPrompt)
                && isDisplayed(emailInput)
                && isDisplayed(passwordInput)
                && isDisplayed(otpInput)
                && isDisplayed(nextButton);
    }

    /**
     * Selects birth date parts (1-based month).
     *
     * @param month 1–12
     * @param day   day of month as displayed
     * @param year  four-digit year
     */
    @Step("Select birth date {2}-{0}-{1}")
    public SignupPage selectBirthDate(int month, int day, int year) {
        openCredentialsForm();
        if (month < 1 || month > 12) {
            throw new IllegalArgumentException("month must be 1–12, got " + month);
        }
        selectBirthOption(monthTrigger, MONTH_LABELS[month - 1]);
        selectBirthOption(dayTrigger, String.valueOf(day));
        selectBirthOption(yearTrigger, String.valueOf(year));
        return this;
    }

    /** Types the signup email. */
    @Step("Enter signup email: {0}")
    public SignupPage enterEmail(String email) {
        openCredentialsForm();
        type(emailInput, email);
        return this;
    }

    /** Types the signup password. */
    @Step("Enter signup password")
    public SignupPage enterPassword(String password) {
        openCredentialsForm();
        type(passwordInput, password);
        return this;
    }

    /** Types the 6-digit OTP. */
    @Step("Enter verification code")
    public SignupPage enterVerificationCode(String code) {
        openCredentialsForm();
        type(otpInput, code);
        return this;
    }

    /** Clicks {@code Gửi mã} when enabled. */
    @Step("Click send verification code")
    public SignupPage clickSendCode() {
        openCredentialsForm();
        WaitUtils.wait(driver, Duration.ofSeconds(20)).until(d -> {
            try {
                WebElement button = d.findElement(sendCodeButton);
                return button.isDisplayed() && button.isEnabled();
            } catch (Exception e) {
                return false;
            }
        });
        click(sendCodeButton);
        return this;
    }

    /** Clicks {@code Tiếp} on the credentials step. */
    @Step("Click Next")
    public SignupPage clickNext() {
        waitClickable(nextButton).click();
        pace();
        return this;
    }

    /** Returns whether {@code Tiếp} is currently enabled. */
    @Step("Is Next enabled")
    public boolean isNextEnabled() {
        return isEnabled(nextButton);
    }

    /** Types / replaces Vibely ID on the username step. */
    @Step("Enter Vibely ID: {0}")
    public SignupPage enterVibelyId(String username) {
        waitVisible(vibelyIdInput);
        type(vibelyIdInput, username);
        return this;
    }

    /** Clicks the final {@code Đăng ký} submit. */
    @Step("Click register")
    public SignupPage clickRegister() {
        WaitUtils.wait(driver, Duration.ofSeconds(20)).until(d -> {
            try {
                WebElement button = d.findElement(registerButton);
                return button.isDisplayed() && button.isEnabled();
            } catch (Exception e) {
                return false;
            }
        });
        click(registerButton);
        return this;
    }

    /** Waits until email availability feedback is shown (available or taken). */
    @Step("Wait for email availability message")
    public String waitForEmailAvailabilityMessage() {
        WaitUtils.wait(driver, Duration.ofSeconds(20)).until(d -> {
            String text = collectEmailStatusText();
            return text.contains("c\u00f3 th\u1ec3")
                    || text.contains("\u0111\u00e3")
                    || text.toLowerCase().contains("available")
                    || text.toLowerCase().contains("taken")
                    || text.toLowerCase().contains("used");
        });
        return collectEmailStatusText();
    }

    /** Waits until Vibely ID availability feedback is shown. */
    @Step("Wait for Vibely ID availability message")
    public String waitForUsernameAvailabilityMessage() {
        WaitUtils.wait(driver, Duration.ofSeconds(20)).until(d -> {
            String text = collectUsernameStatusText();
            return text.contains("c\u00f3 th\u1ec3")
                    || text.contains("\u0111\u00e3")
                    || text.toLowerCase().contains("available")
                    || text.toLowerCase().contains("taken");
        });
        return collectUsernameStatusText();
    }

    private static final Pattern DEMO_CODE_IN_STATUS = Pattern.compile(
            "M\u00e3 x\u00e1c minh:\\s*(\\d{6})|(?:demoCode|demo code)[^0-9]*(\\d{6})",
            Pattern.CASE_INSENSITIVE);

    /**
     * After sending code, waits for status and extracts the local/dev {@code demoCode}
     * (only from verification status text — not arbitrary digits on the page).
     *
     * @return six-digit code, or empty string if not found
     */
    @Step("Wait for OTP status and extract demo code")
    public String waitAndExtractDemoCode() {
        WaitUtils.wait(driver, Duration.ofSeconds(25)).until(d -> {
            if (isCaptchaVisible()) {
                return true;
            }
            String status = visibleStatusBlob();
            return DEMO_CODE_IN_STATUS.matcher(status).find()
                    || status.contains("\u0110\u00e3 g\u1eedi m\u00e3")
                    || status.contains("M\u00e3 x\u00e1c minh");
        });
        if (isCaptchaVisible()) {
            return "";
        }
        String status = visibleStatusBlob();
        Matcher demo = DEMO_CODE_IN_STATUS.matcher(status);
        if (demo.find()) {
            String code = demo.group(1) != null ? demo.group(1) : demo.group(2);
            return code == null ? "" : code;
        }
        // Fallback: 6 digits only inside the centered status line (not whole page / email).
        String centered = getStatusText();
        Matcher fromStatus = SIX_DIGIT_CODE.matcher(centered);
        if (fromStatus.find()) {
            return fromStatus.group(1);
        }
        return "";
    }

    private String visibleStatusBlob() {
        try {
            return driver.findElements(By.cssSelector("p")).stream()
                    .filter(WebElement::isDisplayed)
                    .map(WebElement::getText)
                    .filter(text -> text != null && !text.isBlank())
                    .reduce((a, b) -> a + "\n" + b)
                    .orElse("");
        } catch (Exception e) {
            return getStatusText();
        }
    }

    /** Visible status / helper text under the form. */
    @Step("Get status text")
    public String getStatusText() {
        if (!isDisplayed(statusMessage)) {
            return "";
        }
        return getText(statusMessage);
    }

    /** {@code true} when anti-bot challenge UI is blocking the flow. */
    @Step("Is captcha challenge visible")
    public boolean isCaptchaVisible() {
        return isDisplayed(captchaChallenge);
    }

    /** {@code true} when the username / Vibely ID step is shown. */
    @Step("Is username step visible")
    public boolean isUsernameStepVisible() {
        return isDisplayed(vibelyIdInput) && isDisplayed(registerButton);
    }

    /** Waits until navigation leaves {@code /signup}. */
    @Step("Verify signup success")
    public boolean isSignupSuccess() {
        try {
            WaitUtils.wait(driver, Duration.ofSeconds(25))
                    .until(ExpectedConditions.not(ExpectedConditions.urlContains("/signup")));
            return true;
        } catch (Exception e) {
            return !getCurrentUrl().contains("/signup");
        }
    }

    /** Clicks footer login link. */
    @Step("Click login link")
    public SignupPage clickLoginLink() {
        click(loginLink);
        return this;
    }

    private void selectBirthOption(By trigger, String optionLabel) {
        click(trigger);
        By option = By.xpath(
                "//ul[@role='listbox']//button[normalize-space()='" + optionLabel + "']");
        WebElement optionEl = WaitUtils.waitForVisible(driver, option);
        ((JavascriptExecutor) driver).executeScript(
                "arguments[0].scrollIntoView({block:'nearest'});", optionEl);
        WaitUtils.waitForClickable(driver, option).click();
        pace();
    }

    private String collectEmailStatusText() {
        try {
            return driver.findElements(emailStatus).stream()
                    .map(WebElement::getText)
                    .filter(text -> text != null && !text.isBlank())
                    .reduce((a, b) -> a + " " + b)
                    .orElse("");
        } catch (Exception e) {
            return "";
        }
    }

    private String collectUsernameStatusText() {
        try {
            return driver.findElements(usernameStatus).stream()
                    .map(WebElement::getText)
                    .filter(text -> text != null && !text.isBlank())
                    .reduce((a, b) -> a + " " + b)
                    .orElse("");
        } catch (Exception e) {
            return "";
        }
    }
}
