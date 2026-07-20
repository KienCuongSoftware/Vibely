package com.vibely.automation.message;

import com.vibely.automation.base.BaseTest;
import com.vibely.automation.pages.MessagesPage;
import com.vibely.automation.pages.ProfilePage;
import com.vibely.automation.support.AuthSteps;
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
 * Cross-account DM: A messages B → B accepts request → B replies.
 */
@Epic("Chat")
@Feature("Direct messages")
@Tag("message")
@Tag("smoke")
class MessageTest extends BaseTest {

    @Test
    @DisplayName("A messages B, B accepts request and replies")
    @Story("Message request handshake")
    @Severity(SeverityLevel.CRITICAL)
    @Description("Requires test.user.* (A) and test.user.b.* (B) in credentials.local.properties")
    void aMessagesBThenBAcceptsAndReplies() {
        org.junit.jupiter.api.Assumptions.assumeTrue(
                TestCredentials.isPeerDmConfigured(),
                "Set test.user.* and test.user.b.email / test.user.b.password / test.user.b.username");

        String peerUsername = TestCredentials.peerUsername();
        String aMessage = "Hi from A automation " + System.currentTimeMillis();
        String bMessage = "Hi from B automation " + System.currentTimeMillis();

        // --- Account A: open B profile → Tin nhắn → send first message ---
        AuthSteps.loginAs(driver, TestCredentials.email(), TestCredentials.password());
        MessagesPage aChat = new ProfilePage(driver)
                .open(peerUsername)
                .clickMessage();
        aChat.sendMessage(aMessage);
        AuthSteps.logout(driver);

        // --- Account B: requests → accept → reply ---
        AuthSteps.loginAs(driver, TestCredentials.peerEmail(), TestCredentials.peerPassword());
        MessagesPage bChat = new MessagesPage(driver)
                .open()
                .openMessageRequests()
                .openConversationWith(aMessage)
                .acceptRequestIfNeeded();
        bChat.sendMessage(bMessage);

        assertThat(bChat.isComposerReady()).isTrue();
        assertThat(driver.getCurrentUrl()).contains("/messages");
    }
}
