package com.vibely.automation.upload;

import com.vibely.automation.base.BaseTest;
import com.vibely.automation.pages.FeedPage;
import com.vibely.automation.pages.UploadPage;
import com.vibely.automation.support.AuthSteps;
import com.vibely.automation.support.TestVideoPath;
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
 * Studio upload then For You engagement (like / follow / comment / favorite).
 */
@Epic("Studio")
@Feature("Upload")
@Tag("upload")
@Tag("smoke")
class UploadTest extends BaseTest {

    @Test
    @DisplayName("Upload video then engage on For You")
    @Story("Happy path")
    @Severity(SeverityLevel.BLOCKER)
    @Description("Login → publish → /foryou → like, follow (if needed), comment, favorite")
    void uploadAndEngageOnForYou() {
        AuthSteps.loginWithConfiguredUser(driver);

        org.junit.jupiter.api.Assumptions.assumeTrue(
                TestVideoPath.isConfigured(),
                "Set test.video.path in credentials.local.properties (or TEST_VIDEO_PATH) to an existing .mp4");

        String caption = "Automation upload " + System.currentTimeMillis();
        UploadPage uploadPage = new UploadPage(driver)
                .open()
                .uploadAndPublish(TestVideoPath.path(), caption);

        assertThat(uploadPage.isPublishSuccess())
                .as("Expected /vibelystudio/posts or success toast after Đăng")
                .isTrue();

        String comment = "Automation comment " + System.currentTimeMillis();
        new FeedPage(driver)
                .open()
                .engageWithActiveVideo(comment);

        assertThat(driver.getCurrentUrl()).contains("/foryou");
    }
}
