package com.vibely.backend.notification;

import com.vibely.backend.interaction.entity.CommentEntity;
import com.vibely.backend.interaction.repository.CommentRepository;
import com.vibely.backend.user.entity.User;
import com.vibely.backend.user.repository.UserRepository;
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
    private CommentRepository commentRepository;

    @Autowired
    private SystemNotificationRepository systemNotificationRepository;

    @Test
    void shouldPersistFollowNotificationAndExposeInbox() {
        User follower = saveUser("follower_notif", "follower-notif@vibely.dev");
        User following = saveUser("following_notif", "following-notif@vibely.dev");

        notificationService.onFollow(follower, following);

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
        assertThat(page.items().get(0).actorCount()).isEqualTo(1);
    }

    @Test
    void shouldPurgeVideoLikeNotificationsWhenVideoRemoved() {
        User liker = saveUser("liker_purge", "liker-purge@vibely.dev");
        User author = saveUser("author_purge", "author-purge@vibely.dev");
        Video video = saveVideo(author, "Gone soon");

        notificationService.onVideoLike(liker, video);
        assertThat(userNotificationRepository.count()).isEqualTo(1);

        notificationService.purgeForRemovedVideo(video.getId());

        assertThat(userNotificationRepository.count()).isZero();
        assertThat(notificationService.getUnreadCount(author.getEmail()).count()).isZero();
    }

    @Test
    void shouldAggregateMultipleVideoLikesIntoSingleBucket() {
        User author = saveUser("author_agg", "author-agg@vibely.dev");
        User likerA = saveUser("liker_a", "liker-a@vibely.dev");
        User likerB = saveUser("liker_b", "liker-b@vibely.dev");
        User likerC = saveUser("liker_c", "liker-c@vibely.dev");
        Video video = saveVideo(author, "Viral clip");

        notificationService.onVideoLike(likerA, video);
        notificationService.onVideoLike(likerB, video);
        notificationService.onVideoLike(likerC, video);
        notificationService.onVideoLike(likerB, video);

        assertThat(userNotificationRepository.count()).isEqualTo(1);

        NotificationPageResponse page = notificationService.getInbox(
            author.getEmail(),
            NotificationFilter.likes,
            null,
            20
        );

        assertThat(page.items()).hasSize(1);
        assertThat(page.items().get(0).actorCount()).isEqualTo(3);
        assertThat(page.items().get(0).actor().username()).isEqualTo("liker_c");
        assertThat(notificationService.getUnreadCount(author.getEmail()).count()).isEqualTo(1);

        notificationService.onVideoUnlike(likerC, video);

        NotificationItemResponse afterUnlike = notificationService.getInbox(
            author.getEmail(),
            NotificationFilter.likes,
            null,
            20
        ).items().get(0);
        assertThat(afterUnlike.actorCount()).isEqualTo(2);
    }

    @Test
    void shouldAggregateMultipleCommentRepliesIntoSingleBucket() {
        User author = saveUser("parent_author", "parent-author@vibely.dev");
        User replierA = saveUser("replier_a", "replier-a@vibely.dev");
        User replierB = saveUser("replier_b", "replier-b@vibely.dev");
        Video video = saveVideo(author, "Reply storm");
        CommentEntity parent = saveComment(author, video, "Bình luận gốc");
        CommentEntity replyA = saveReply(replierA, video, parent, "Reply A");
        CommentEntity replyB = saveReply(replierB, video, parent, "Reply B");

        notificationService.onCommentReply(replierA, replyA, parent, video);
        notificationService.onCommentReply(replierB, replyB, parent, video);

        assertThat(userNotificationRepository.count()).isEqualTo(1);

        NotificationItemResponse item = notificationService.getInbox(
            author.getEmail(),
            NotificationFilter.comments,
            null,
            20
        ).items().get(0);

        assertThat(item.type()).isEqualTo(NotificationType.COMMENT_REPLY);
        assertThat(item.actorCount()).isEqualTo(2);
        assertThat(item.commentId()).isEqualTo(parent.getId());
        assertThat(item.preview()).isEqualTo("Reply B");
    }

    @Test
    void shouldAggregateMultipleCommentLikesIntoSingleBucket() {
        User author = saveUser("comment_author", "comment-author@vibely.dev");
        User likerA = saveUser("comment_liker_a", "comment-liker-a@vibely.dev");
        User likerB = saveUser("comment_liker_b", "comment-liker-b@vibely.dev");
        Video video = saveVideo(author, "Comment likes");
        CommentEntity comment = saveComment(author, video, "Hay quá");

        notificationService.onCommentLike(likerA, comment, video);
        notificationService.onCommentLike(likerB, comment, video);
        notificationService.onCommentLike(likerA, comment, video);

        assertThat(userNotificationRepository.count()).isEqualTo(1);

        NotificationItemResponse item = notificationService.getInbox(
            author.getEmail(),
            NotificationFilter.likes,
            null,
            20
        ).items().get(0);

        assertThat(item.type()).isEqualTo(NotificationType.COMMENT_LIKE);
        assertThat(item.actorCount()).isEqualTo(2);

        notificationService.onCommentUnlike(likerB, comment);
        assertThat(notificationService.getInbox(
            author.getEmail(),
            NotificationFilter.likes,
            null,
            20
        ).items().get(0).actorCount()).isEqualTo(1);
    }

    @Test
    void shouldAggregateMultipleFollowsIntoSingleBucket() {
        User following = saveUser("followed_user", "followed-user@vibely.dev");
        User followerA = saveUser("follower_a", "follower-a@vibely.dev");
        User followerB = saveUser("follower_b", "follower-b@vibely.dev");
        User followerC = saveUser("follower_c", "follower-c@vibely.dev");

        notificationService.onFollow(followerA, following);
        notificationService.onFollow(followerB, following);
        notificationService.onFollow(followerC, following);
        notificationService.onFollow(followerB, following);

        assertThat(userNotificationRepository.count()).isEqualTo(1);

        NotificationItemResponse item = notificationService.getInbox(
            following.getEmail(),
            NotificationFilter.followers,
            null,
            20
        ).items().get(0);

        assertThat(item.type()).isEqualTo(NotificationType.FOLLOW);
        assertThat(item.actorCount()).isEqualTo(3);
        assertThat(notificationService.getUnreadCount(following.getEmail()).count()).isEqualTo(1);

        notificationService.onUnfollow(followerC, following);

        assertThat(notificationService.getInbox(
            following.getEmail(),
            NotificationFilter.followers,
            null,
            20
        ).items().get(0).actorCount()).isEqualTo(2);
    }

    @Test
    void shouldAggregateMultipleMentionsOnSameVideoIntoSingleBucket() {
        User mentioned = saveUser("mentioned_user", "mentioned-user@vibely.dev");
        User author = saveUser("mention_author", "mention-author@vibely.dev");
        User mentionerA = saveUser("mentioner_a", "mentioner-a@vibely.dev");
        User mentionerB = saveUser("mentioner_b", "mentioner-b@vibely.dev");
        Video video = saveVideo(author, "Mention video");
        CommentEntity commentA = saveComment(mentionerA, video, "Hey @mentioned_user");
        CommentEntity commentB = saveComment(mentionerB, video, "Also @mentioned_user here");

        notificationService.onMentions(mentionerA, commentA, video, commentA.getContent());
        notificationService.onMentions(mentionerB, commentB, video, commentB.getContent());

        assertThat(userNotificationRepository.count()).isEqualTo(1);

        NotificationItemResponse item = notificationService.getInbox(
            mentioned.getEmail(),
            NotificationFilter.mentions,
            null,
            20
        ).items().get(0);

        assertThat(item.type()).isEqualTo(NotificationType.MENTION);
        assertThat(item.actorCount()).isEqualTo(2);
        assertThat(item.videoPublicId()).isEqualTo(video.getPublicId());
        assertThat(item.preview()).isEqualTo("Also @mentioned_user here");
        assertThat(item.commentId()).isEqualTo(commentB.getId());

        notificationService.onMentions(mentionerA, commentA, video, commentA.getContent());
        NotificationItemResponse bumped = notificationService.getInbox(
            mentioned.getEmail(),
            NotificationFilter.mentions,
            null,
            20
        ).items().get(0);
        assertThat(bumped.actorCount()).isEqualTo(2);
        assertThat(bumped.preview()).isEqualTo("Hey @mentioned_user");
        assertThat(bumped.commentId()).isEqualTo(commentA.getId());
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

    private CommentEntity saveComment(User user, Video video, String content) {
        CommentEntity comment = new CommentEntity();
        comment.setUser(user);
        comment.setVideo(video);
        comment.setContent(content);
        return commentRepository.save(comment);
    }

    private CommentEntity saveReply(User user, Video video, CommentEntity parent, String content) {
        CommentEntity reply = new CommentEntity();
        reply.setUser(user);
        reply.setVideo(video);
        reply.setParentComment(parent);
        reply.setContent(content);
        return commentRepository.save(reply);
    }
}
