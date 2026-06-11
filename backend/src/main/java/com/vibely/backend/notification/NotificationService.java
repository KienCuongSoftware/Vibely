package com.vibely.backend.notification;

import com.vibely.backend.auth.UserAvatarResolver;
import com.vibely.backend.common.BadRequestException;
import com.vibely.backend.common.NotFoundException;
import com.vibely.backend.feed.FeedCursorCodec;
import com.vibely.backend.interaction.CommentEntity;
import com.vibely.backend.interaction.FollowRepository;
import com.vibely.backend.user.User;
import com.vibely.backend.user.UserRepository;
import com.vibely.backend.video.Video;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class NotificationService {

    private static final int MAX_PREVIEW_LENGTH = 240;

    private final UserRepository userRepository;
    private final UserNotificationRepository userNotificationRepository;
    private final SystemNotificationRepository systemNotificationRepository;
    private final FollowRepository followRepository;
    private final UserAvatarResolver userAvatarResolver;

    public NotificationService(
        UserRepository userRepository,
        UserNotificationRepository userNotificationRepository,
        SystemNotificationRepository systemNotificationRepository,
        FollowRepository followRepository,
        UserAvatarResolver userAvatarResolver
    ) {
        this.userRepository = userRepository;
        this.userNotificationRepository = userNotificationRepository;
        this.systemNotificationRepository = systemNotificationRepository;
        this.followRepository = followRepository;
        this.userAvatarResolver = userAvatarResolver;
    }

    public void onFollow(User follower, User following) {
        if (follower == null || following == null || follower.getId().equals(following.getId())) {
            return;
        }
        if (userNotificationRepository.existsByRecipient_IdAndActor_IdAndType(
            following.getId(),
            follower.getId(),
            NotificationType.FOLLOW
        )) {
            return;
        }
        UserNotificationEntity row = baseRow(following, follower, NotificationType.FOLLOW);
        userNotificationRepository.save(row);
    }

    public void onVideoLike(User actor, Video video) {
        if (actor == null || video == null || video.getAuthor() == null) {
            return;
        }
        User recipient = video.getAuthor();
        if (actor.getId().equals(recipient.getId())) {
            return;
        }
        if (userNotificationRepository.existsByRecipient_IdAndActor_IdAndTypeAndVideo_Id(
            recipient.getId(),
            actor.getId(),
            NotificationType.VIDEO_LIKE,
            video.getId()
        )) {
            return;
        }
        UserNotificationEntity row = baseRow(recipient, actor, NotificationType.VIDEO_LIKE);
        row.setVideo(video);
        userNotificationRepository.save(row);
    }

    public void onCommentLike(User actor, CommentEntity comment, Video video) {
        if (actor == null || comment == null || comment.getUser() == null) {
            return;
        }
        User recipient = comment.getUser();
        if (actor.getId().equals(recipient.getId())) {
            return;
        }
        if (userNotificationRepository.existsByRecipient_IdAndActor_IdAndTypeAndComment_Id(
            recipient.getId(),
            actor.getId(),
            NotificationType.COMMENT_LIKE,
            comment.getId()
        )) {
            return;
        }
        UserNotificationEntity row = baseRow(recipient, actor, NotificationType.COMMENT_LIKE);
        row.setVideo(video);
        row.setComment(comment);
        row.setPreview(truncate(comment.getContent()));
        userNotificationRepository.save(row);
    }

    public void onCommentReply(User actor, CommentEntity reply, CommentEntity parent, Video video) {
        if (actor == null || parent == null || parent.getUser() == null) {
            return;
        }
        User recipient = parent.getUser();
        if (actor.getId().equals(recipient.getId())) {
            return;
        }
        UserNotificationEntity row = baseRow(recipient, actor, NotificationType.COMMENT_REPLY);
        row.setVideo(video);
        row.setComment(reply);
        row.setPreview(truncate(reply.getContent()));
        userNotificationRepository.save(row);
    }

    public void onMentions(User actor, CommentEntity comment, Video video, String content) {
        if (actor == null || comment == null || content == null || content.isBlank()) {
            return;
        }
        Set<Long> notified = new HashSet<>();
        for (String username : MentionParser.extractUsernames(content)) {
            userRepository.findByUsername(username).ifPresent(mentioned -> {
                if (mentioned.getId() == null || actor.getId().equals(mentioned.getId())) {
                    return;
                }
                if (!notified.add(mentioned.getId())) {
                    return;
                }
                UserNotificationEntity row = baseRow(mentioned, actor, NotificationType.MENTION);
                row.setVideo(video);
                row.setComment(comment);
                row.setPreview(truncate(content));
                userNotificationRepository.save(row);
            });
        }
    }

    @Transactional(readOnly = true)
    public NotificationPageResponse getInbox(String email, NotificationFilter filter, String cursor, int size) {
        User recipient = getUser(email);
        int pageSize = clampSize(size);
        FeedCursorCodec.Decoded decoded = decodeCursor(cursor);
        List<NotificationType> types = filter.toTypes();
        List<UserNotificationEntity> rows = userNotificationRepository.findInboxPage(
            recipient.getId(),
            filter == NotificationFilter.all,
            types,
            decoded != null ? decoded.createdAt() : null,
            decoded != null ? decoded.id() : null,
            PageRequest.of(0, pageSize + 1)
        );
        boolean hasNext = rows.size() > pageSize;
        List<UserNotificationEntity> pageRows = hasNext ? rows.subList(0, pageSize) : rows;
        Set<Long> actorIds = pageRows.stream()
            .map(row -> row.getActor() != null ? row.getActor().getId() : null)
            .filter(id -> id != null)
            .collect(java.util.stream.Collectors.toSet());
        Set<Long> followedActorIds = actorIds.isEmpty()
            ? Set.of()
            : new HashSet<>(followRepository.findFollowingIdsForFollower(recipient.getId(), actorIds));
        List<NotificationItemResponse> items = pageRows.stream()
            .map(row -> toItem(row, followedActorIds))
            .toList();
        String nextCursor = null;
        if (hasNext && !pageRows.isEmpty()) {
            UserNotificationEntity last = pageRows.get(pageRows.size() - 1);
            nextCursor = FeedCursorCodec.encode(last.getCreatedAt(), last.getId());
        }
        String systemPreview = systemNotificationRepository
            .findFirstByActiveTrueOrderByCreatedAtDescIdDesc()
            .map(this::toSystemPreview)
            .orElse(null);
        return new NotificationPageResponse(items, nextCursor, hasNext, systemPreview);
    }

    @Transactional(readOnly = true)
    public SystemNotificationPageResponse getSystemInbox(
        SystemNotificationFilter filter,
        String cursor,
        int size
    ) {
        int pageSize = clampSize(size);
        FeedCursorCodec.Decoded decoded = decodeCursor(cursor);
        SystemNotificationCategory category = filter.toCategory();
        List<SystemNotificationEntity> rows = systemNotificationRepository.findActivePage(
            filter == SystemNotificationFilter.all,
            category,
            decoded != null ? decoded.createdAt() : null,
            decoded != null ? decoded.id() : null,
            PageRequest.of(0, pageSize + 1)
        );
        boolean hasNext = rows.size() > pageSize;
        List<SystemNotificationEntity> pageRows = hasNext ? rows.subList(0, pageSize) : rows;
        List<SystemNotificationItemResponse> items = pageRows.stream().map(this::toSystemItem).toList();
        String nextCursor = null;
        if (hasNext && !pageRows.isEmpty()) {
            SystemNotificationEntity last = pageRows.get(pageRows.size() - 1);
            nextCursor = FeedCursorCodec.encode(last.getCreatedAt(), last.getId());
        }
        return new SystemNotificationPageResponse(items, nextCursor, hasNext);
    }

    @Transactional(readOnly = true)
    public NotificationUnreadCountResponse getUnreadCount(String email) {
        User recipient = getUser(email);
        long count = userNotificationRepository.countByRecipient_IdAndReadAtIsNull(recipient.getId());
        return new NotificationUnreadCountResponse(count);
    }

    public void markRead(String email, Long notificationId) {
        User recipient = getUser(email);
        UserNotificationEntity row = userNotificationRepository
            .findByIdAndRecipient_Id(notificationId, recipient.getId())
            .orElseThrow(() -> new NotFoundException("Không tìm thấy thông báo"));
        if (row.getReadAt() == null) {
            row.setReadAt(LocalDateTime.now());
        }
    }

    public void markReadBatch(String email, List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            throw new BadRequestException("Danh sách thông báo trống.");
        }
        User recipient = getUser(email);
        userNotificationRepository.markReadBatch(recipient.getId(), ids, LocalDateTime.now());
    }

    private UserNotificationEntity baseRow(User recipient, User actor, NotificationType type) {
        UserNotificationEntity row = new UserNotificationEntity();
        row.setRecipient(recipient);
        row.setActor(actor);
        row.setType(type);
        return row;
    }

    private NotificationItemResponse toItem(UserNotificationEntity row, Set<Long> followedActorIds) {
        User actor = row.getActor();
        Long actorId = actor != null ? actor.getId() : null;
        UUID videoPublicId = row.getVideo() != null ? row.getVideo().getPublicId() : null;
        Long commentId = row.getComment() != null ? row.getComment().getId() : null;
        return new NotificationItemResponse(
            row.getId(),
            row.getType(),
            actor != null
                ? new NotificationActorResponse(
                    actor.getId(),
                    actor.getUsername(),
                    actor.getDisplayName(),
                    userAvatarResolver.resolve(actor)
                )
                : null,
            row.getPreview(),
            videoPublicId,
            commentId,
            actorId != null && followedActorIds.contains(actorId),
            row.getReadAt() != null,
            row.getCreatedAt()
        );
    }

    private SystemNotificationItemResponse toSystemItem(SystemNotificationEntity row) {
        return new SystemNotificationItemResponse(
            row.getId(),
            row.getCategory(),
            row.getBadge(),
            row.getTitle(),
            row.getBody(),
            row.getCreatedAt()
        );
    }

    private String toSystemPreview(SystemNotificationEntity row) {
        String badge = row.getBadge() != null && !row.getBadge().isBlank() ? row.getBadge() + ": " : "";
        String body = row.getBody() != null && !row.getBody().isBlank() ? row.getBody() : row.getTitle();
        return truncate(badge + body);
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng"));
    }

    private static FeedCursorCodec.Decoded decodeCursor(String cursor) {
        if (cursor == null || cursor.isBlank()) {
            return null;
        }
        return FeedCursorCodec.decode(cursor);
    }

    private static int clampSize(int size) {
        return Math.min(Math.max(size, 1), 50);
    }

    private static String truncate(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim().replaceAll("\\s+", " ");
        if (trimmed.length() <= MAX_PREVIEW_LENGTH) {
            return trimmed;
        }
        return trimmed.substring(0, MAX_PREVIEW_LENGTH - 1) + "…";
    }
}
