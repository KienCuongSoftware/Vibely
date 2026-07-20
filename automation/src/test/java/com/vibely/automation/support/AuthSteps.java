package com.vibely.automation.support;

import com.vibely.automation.pages.LoginPage;
import org.openqa.selenium.WebDriver;

/**
 * Shared authenticated-session helpers for UI tests.
 */
public final class AuthSteps {

    private AuthSteps() {
    }

    /**
     * Logs in with {@link TestCredentials} when configured; otherwise aborts the test.
     *
     * @param driver active WebDriver
     */
    public static void loginWithConfiguredUser(WebDriver driver) {
        org.junit.jupiter.api.Assumptions.assumeTrue(
                TestCredentials.isConfigured(),
                "Set credentials.local.properties (test.user.email / test.user.password)");
        LoginPage loginPage = new LoginPage(driver).open().login(TestCredentials.email(), TestCredentials.password());
        org.junit.jupiter.api.Assumptions.assumeTrue(
                loginPage.isLoginSuccess(),
                "Login failed — check credentials and captcha/auth-protection settings");
    }
}
