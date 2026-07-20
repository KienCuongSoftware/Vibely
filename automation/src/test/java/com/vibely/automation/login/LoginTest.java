package com.vibely.automation.login;

import com.vibely.automation.base.BaseTest;
import com.vibely.automation.pages.HomePage;
import com.vibely.automation.pages.LoginPage;
import com.vibely.automation.support.TestCredentials;
import io.qameta.allure.Description;
import io.qameta.allure.Epic;
import io.qameta.allure.Feature;
import io.qameta.allure.Severity;
import io.qameta.allure.SeverityLevel;
import io.qameta.allure.Story;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Login UI test using credentials from {@code credentials.local.properties}.
 */
@Epic("Authentication")
@Feature("Login")
@Tag("login")
class LoginTest extends BaseTest {

    @Test
    @DisplayName("Login successfully with valid credentials")
    @Story("Happy path")
    @Severity(SeverityLevel.BLOCKER)
    @Description("Uses credentials.local.properties or TEST_USER_EMAIL / TEST_USER_PASSWORD")
    void loginSuccessfully() {
        org.junit.jupiter.api.Assumptions.assumeTrue(
                TestCredentials.isConfigured(),
                "Set credentials.local.properties (test.user.email / test.user.password) or TEST_USER_* env vars");

        LoginPage loginPage = new LoginPage(driver).open();
        loginPage.login(TestCredentials.email(), TestCredentials.password());

        assertThat(loginPage.isLoginSuccess()).isTrue();
        assertThat(new HomePage(driver).isLoaded()).isTrue();
    }
}
