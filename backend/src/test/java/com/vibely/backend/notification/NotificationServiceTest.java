package com.vibely.backend.notification;

import com.vibely.backend.user.User;
import com.vibely.backend.user.UserRepository;
import com.vibely.backend.video.Video;
import com.vibely.backend.video.VideoRepository;
import com.vibely.backend.video.VideoStatus;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class NotificationServiceTest {

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private VideoRepository videoRepository;

    @Autowired
    private UserNotificationRepository userNotificationRepository;

    @Autowired
    private SystemNotificationRepository systemNotificationRepository;

    @Test
    void shouldPersistFollowNotificationAndExposeInbox() {
        User follower = saveUser("follower_notif", "follower-notif@vibely.dev");
        User following = saveUser("following_notif", "following-notif@vibely.dev");

        notificationService.onFollow(follower, following);

        assertThat(
            userNotificationRepository.existsByRecipient_IdAndActor_IdAndType(
                following.getId(),
                follower.getId(),
                NotificationType.FOLLOW
            )
        ).isTrue();

        NotificationPageResponse page = notificationService.getInbox(
            following.getEmail(),
            NotificationFilter.followers,
            null,
            20
        );

        assertThat(page.items()).hasSize(1);
        assertThat(page.items().get(0).type()).isEqualTo(NotificationType.FOLLOW);
        assertThat(page.items().get(0).actor().username()).isEqualTo("follower_notif");
        assertThat(notificationService.getUnreadCount(following.getEmail()).count()).isEqualTo(1);
    }

    @Test
    void shouldPersistVideoLikeNotificationForAuthor() {
        User liker = saveUser("liker_notif", "liker-notif@vibely.dev");
        User author = saveUser("author_notif", "author-notif@vibely.dev");
        Video video = saveVideo(author, "Like me");

        notificationService.onVideoLike(liker, video);

        NotificationPageResponse page = notificationService.getInbox(
            author.getEmail(),
            NotificationFilter.likes,
            null,
            20
        );

        assertThat(page.items()).hasSize(1);
        assertThat(page.items().get(0).type()).isEqualTo(NotificationType.VIDEO_LIKE);
        assertThat(page.items().get(0).videoPublicId()).isEqualTo(video.getPublicId());
    }

    @Test
    void shouldReturnActiveSystemNotifications() {
        SystemNotificationEntity row = new SystemNotificationEntity();
        row.setCategory(SystemNotificationCategory.live);
        row.setBadge("LIVE");
        row.setTitle("Test LIVE");
        row.setBody("Body");
        systemNotificationRepository.save(row);

        SystemNotificationPageResponse page = notificationService.getSystemInbox(
            SystemNotificationFilter.live,
            null,
            20
        );

        assertThat(page.items()).isNotEmpty();
        assertThat(page.items().get(0).title()).isEqualTo("Test LIVE");
    }

    private User saveUser(String username, String email) {
        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setDisplayName(username);
        user.setPasswordHash("hash");
        user.setBirthDate(LocalDate.of(2000, 1, 1));
        return userRepository.save(user);
    }

    private Video saveVideo(User author, String title) {
        Video video = new Video();
        video.setAuthor(author);
        video.setTitle(title);
        video.setDescription("desc");
        video.setVideoUrl("https://cdn.example.com/video.mp4");
        video.setThumbnailUrl("https://cdn.example.com/thumb.jpg");
        video.setStatus(VideoStatus.READY);
        return videoRepository.save(video);
    }
}
