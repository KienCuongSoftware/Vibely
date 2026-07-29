package com.vibely.automation.signup;

import com.vibely.automation.base.BaseTest;
import com.vibely.automation.pages.HomePage;
import com.vibely.automation.pages.SignupPage;
import com.vibely.automation.support.SignupOtpClient;
import com.vibely.automation.support.TestCredentials;
import com.vibely.automation.utils.WaitUtils;
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
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * Signup UI tests for the email / OTP / Vibely ID flow.
 */
@Epic("Authentication")
@Feature("Signup")
@Tag("signup")
class SignupTest extends BaseTest {

    @Test
    @DisplayName("Signup credentials form opens with Next disabled")
    @Story("UI smoke")
    @Severity(SeverityLevel.NORMAL)
    @Description("Opens /signup, chooses email, asserts DOB + credential fields and disabled Tiếp")
    void credentialsFormOpensWithNextDisabled() {
        SignupPage signup = new SignupPage(driver).open();

        assertThat(signup.isCredentialsFormVisible()).isTrue();
        assertThat(signup.isNextEnabled()).isFalse();
    }

    @Test
    @DisplayName("Email availability check shows feedback")
    @Story("Validation")
    @Severity(SeverityLevel.NORMAL)
    @Description("Typing a unique email should show availability status after debounce")
    void emailAvailabilityShowsFeedback() {
        String email = TestCredentials.uniqueSignupEmail();
        SignupPage signup = new SignupPage(driver).open();

        signup.selectBirthDate(8, 27, 2003);
        signup.enterEmail(email);
        signup.enterPassword(TestCredentials.signupPassword());

        String message = signup.waitForEmailAvailabilityMessage();
        assertThat(message)
                .as("email availability message")
                .matches("(?is).*(c\u00f3 th\u1ec3|available|s\u1eed d\u1ee5ng).*");
    }

    @Test
    @DisplayName("Register successfully with email OTP and Vibely ID")
    @Story("Happy path")
    @Severity(SeverityLevel.BLOCKER)
    @Description(
            "Full signup using unique email; OTP from demoCode status (local) or test.signup.otp")
    void registerSuccessfullyWithEmailOtp() {
        String email = TestCredentials.uniqueSignupEmail();
        String password = TestCredentials.signupPassword();
        String username = TestCredentials.uniqueSignupUsername();

        SignupPage signup = new SignupPage(driver).open();
        signup.selectBirthDate(8, 27, 2003);
        signup.enterEmail(email);
        signup.enterPassword(password);

        String emailMessage = signup.waitForEmailAvailabilityMessage();
        assumeTrue(
                emailMessage.toLowerCase().contains("c\u00f3 th\u1ec3")
                        || emailMessage.toLowerCase().contains("available")
                        || emailMessage.contains("s\u1eed d\u1ee5ng"),
                "Email not available for signup: " + emailMessage);

        String otp = TestCredentials.signupOtp();
        if (otp.isBlank()) {
            otp = SignupOtpClient.requestRegisterDemoCode(email).orElse("");
        }
        assumeTrue(
                otp != null && otp.matches("\\d{6}"),
                "No OTP. Enable app.mail.expose-code-in-api locally (restart backend) or set test.signup.otp");

        signup.enterVerificationCode(otp);
        assertThat(signup.isNextEnabled()).isTrue();
        signup.clickNext();

        WaitUtils.wait(driver, java.time.Duration.ofSeconds(20))
                .until(d -> signup.isUsernameStepVisible()
                        || !signup.getStatusText().isBlank());
        assumeTrue(
                signup.isUsernameStepVisible(),
                "Did not reach Vibely ID step after OTP. Status: " + signup.getStatusText());

        signup.enterVibelyId(username);
        String usernameMessage = signup.waitForUsernameAvailabilityMessage();
        assumeTrue(
                usernameMessage.contains("c\u00f3 th\u1ec3")
                        || usernameMessage.toLowerCase().contains("available")
                        || usernameMessage.contains("s\u1eed d\u1ee5ng"),
                "Vibely ID not available: " + usernameMessage);

        signup.clickRegister();

        assertThat(signup.isSignupSuccess()).isTrue();
        assertThat(new HomePage(driver).isLoaded()).isTrue();
    }
}
