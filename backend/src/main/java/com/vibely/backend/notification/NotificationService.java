package com.vibely.backend.notification;

import com.vibely.backend.auth.service.UserAvatarResolver;
import com.vibely.backend.common.BadRequestException;
import com.vibely.backend.common.NotFoundException;
import com.vibely.backend.feed.FeedCursorCodec;
import com.vibely.backend.storage.MediaUrlPresigner;
import com.vibely.backend.interaction.entity.CommentEntity;
import com.vibely.backend.interaction.repository.FollowRepository;
import com.vibely.backend.user.entity.User;
import com.vibely.backend.user.repository.UserRepository;
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
    private final UserNotificationActorRepository userNotificationActorRepository;
    private final SystemNotificationRepository systemNotificationRepository;
    private final FollowRepository followRepository;
    private final UserAvatarResolver userAvatarResolver;
    private final MediaUrlPresigner mediaUrlPresigner;
    private final NotificationRealtimePublisher realtimePublisher;

    public NotificationService(
        UserRepository userRepository,
        UserNotificationRepository userNotificationRepository,
        UserNotificationActorRepository userNotificationActorRepository,
        SystemNotificationRepository systemNotificationRepository,
        FollowRepository followRepository,
        UserAvatarResolver userAvatarResolver,
        MediaUrlPresigner mediaUrlPresigner,
        NotificationRealtimePublisher realtimePublisher
    ) {
        this.userRepository = userRepository;
        this.userNotificationRepository = userNotificationRepository;
        this.userNotificationActorRepository = userNotificationActorRepository;
        this.systemNotificationRepository = systemNotificationRepository;
        this.followRepository = followRepository;
        this.userAvatarResolver = userAvatarResolver;
        this.mediaUrlPresigner = mediaUrlPresigner;
        this.realtimePublisher = realtimePublisher;
    }

    public void onFollow(User follower, User following) {
        if (follower == null || following == null || follower.getId().equals(following.getId())) {
            return;
        }
        userNotificationRepository
            .findFollowBucket(following.getId(), NotificationType.FOLLOW)
            .ifPresentOrElse(
                bucket -> appendActor(bucket, follower, null, false),
                () -> createFollowBucket(following, follower)
            );
    }

    public void onFollowRequest(User follower, User following) {
        if (follower == null || following == null || follower.getId().equals(following.getId())) {
            return;
        }
        if (userNotificationRepository.findFollowRequestNotification(following.getId(), follower.getId()).isPresent()) {
            return;
        }
        UserNotificationEntity row = baseRow(following, follower, NotificationType.FOLLOW_REQUEST);
        saveBucketWithActor(row, follower);
    }

    public void onFollowRequestCancelled(User follower, User following) {
        if (follower == null || following == null || follower.getId().equals(following.getId())) {
            return;
        }
        userNotificationRepository
            .findFollowRequestNotification(following.getId(), follower.getId())
            .ifPresent(row -> {
                userNotificationRepository.delete(row);
                publishBucketRemoved(following, row.getId());
            });
    }

    public void onFollowRequestAccepted(User follower, User following) {
        onFollowRequestCancelled(follower, following);
    }

    public void onUnfollow(User follower, User following) {
        if (follower == null || following == null || follower.getId().equals(following.getId())) {
            return;
        }
        userNotificationRepository
            .findFollowBucket(following.getId(), NotificationType.FOLLOW)
            .ifPresent(bucket -> removeActor(bucket, follower.getId()));
    }

    public void onVideoLike(User actor, Video video) {
        if (actor == null || video == null || video.getAuthor() == null || video.getId() == null) {
            return;
        }
        User recipient = video.getAuthor();
        if (actor.getId().equals(recipient.getId())) {
            return;
        }
        userNotificationRepository
            .findVideoLikeBucket(recipient.getId(), video.getId(), NotificationType.VIDEO_LIKE)
            .ifPresentOrElse(
                bucket -> appendActor(bucket, actor, null, false),
                () -> createVideoLikeBucket(recipient, actor, video)
            );
    }

    public void onVideoUnlike(User actor, Video video) {
        if (actor == null || video == null || video.getAuthor() == null || video.getId() == null) {
            return;
        }
        User recipient = video.getAuthor();
        if (actor.getId().equals(recipient.getId())) {
            return;
        }
        userNotificationRepository
            .findVideoLikeBucket(recipient.getId(), video.getId(), NotificationType.VIDEO_LIKE)
            .ifPresent(bucket -> removeActor(bucket, actor.getId()));
    }

    public void onCommentLike(User actor, CommentEntity comment, Video video) {
        if (actor == null || comment == null || comment.getUser() == null || comment.getId() == null) {
            return;
        }
        User recipient = comment.getUser();
        if (actor.getId().equals(recipient.getId())) {
            return;
        }
        userNotificationRepository
            .findCommentBucket(recipient.getId(), comment.getId(), NotificationType.COMMENT_LIKE)
            .ifPresentOrElse(
                bucket -> appendActor(bucket, actor, null, false),
                () -> createCommentLikeBucket(recipient, actor, comment, video)
            );
    }

    public void onCommentUnlike(User actor, CommentEntity comment) {
        if (actor == null || comment == null || comment.getUser() == null || comment.getId() == null) {
            return;
        }
        User recipient = comment.getUser();
        if (actor.getId().equals(recipient.getId())) {
            return;
        }
        userNotificationRepository
            .findCommentBucket(recipient.getId(), comment.getId(), NotificationType.COMMENT_LIKE)
            .ifPresent(bucket -> removeActor(bucket, actor.getId()));
    }

    public void onCommentReply(User actor, CommentEntity reply, CommentEntity parent, Video video) {
        if (actor == null || parent == null || parent.getUser() == null || parent.getId() == null) {
            return;
        }
        User recipient = parent.getUser();
        if (actor.getId().equals(recipient.getId())) {
            return;
        }
        String preview = truncate(reply.getContent());
        userNotificationRepository
            .findCommentBucket(recipient.getId(), parent.getId(), NotificationType.COMMENT_REPLY)
            .ifPresentOrElse(
                bucket -> appendActor(bucket, actor, preview, true),
                () -> createCommentReplyBucket(recipient, actor, parent, video, preview)
            );
    }

    public void onMentions(User actor, CommentEntity comment, Video video, String content) {
        if (actor == null || comment == null || video == null || video.getId() == null
            || content == null || content.isBlank()) {
            return;
        }
        String preview = truncate(content);
        Set<Long> notified = new HashSet<>();
        for (String username : MentionParser.extractUsernames(content)) {
            userRepository.findByUsername(username).ifPresent(mentioned -> {
                if (mentioned.getId() == null || actor.getId().equals(mentioned.getId())) {
                    return;
                }
                if (!notified.add(mentioned.getId())) {
                    return;
                }
                userNotificationRepository
                    .findMentionBucket(mentioned.getId(), video.getId(), NotificationType.MENTION)
                    .ifPresentOrElse(
                        bucket -> {
                            bucket.setComment(comment);
                            appendActor(bucket, actor, preview, true);
                        },
                        () -> createMentionBucket(mentioned, actor, comment, video, preview)
                    );
            });
        }
    }

    @Transactional(readOnly = true)
    public NotificationPageResponse getInbox(String email, NotificationFilter filter, String cursor, int size) {
        User recipient = getUser(email);
        int pageSize = clampSize(size);
        FeedCursorCodec.Decoded decoded = decodeCursor(cursor);
        List<NotificationType> types = filter.toTypes();
        PageRequest pageRequest = PageRequest.of(0, pageSize + 1);
        List<UserNotificationEntity> rows = loadInboxPage(recipient.getId(), filter, types, decoded, pageRequest);
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
            nextCursor = FeedCursorCodec.encode(last.getUpdatedAt(), last.getId());
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
        PageRequest pageRequest = PageRequest.of(0, pageSize + 1);
        List<SystemNotificationEntity> rows = loadSystemInboxPage(filter, category, decoded, pageRequest);
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

    /** Xóa thông báo gắn video đã gỡ (soft delete — DB vẫn giữ row videos). */
    public void purgeForRemovedVideo(Long videoId) {
        if (videoId == null) {
            return;
        }
        List<UserNotificationEntity> rows = userNotificationRepository.findAllLinkedToVideo(videoId);
        for (UserNotificationEntity row : rows) {
            User recipient = row.getRecipient();
            long notificationId = row.getId();
            userNotificationActorRepository.deleteByNotificationId(notificationId);
            userNotificationRepository.delete(row);
            publishBucketRemoved(recipient, notificationId);
        }
    }

    private List<SystemNotificationEntity> loadSystemInboxPage(
        SystemNotificationFilter filter,
        SystemNotificationCategory category,
        FeedCursorCodec.Decoded decoded,
        PageRequest pageRequest
    ) {
        boolean filterAll = filter == SystemNotificationFilter.all;
        if (decoded == null) {
            if (filterAll) {
                return systemNotificationRepository.findActiveFirstPage(pageRequest);
            }
            return systemNotificationRepository.findActiveFirstPageByCategory(category, pageRequest);
        }
        if (filterAll) {
            return systemNotificationRepository.findActiveAfterCursor(
                decoded.createdAt(),
                decoded.id(),
                pageRequest
            );
        }
        return systemNotificationRepository.findActiveAfterCursorByCategory(
            category,
            decoded.createdAt(),
            decoded.id(),
            pageRequest
        );
    }

    private List<UserNotificationEntity> loadInboxPage(
        Long recipientId,
        NotificationFilter filter,
        List<NotificationType> types,
        FeedCursorCodec.Decoded decoded,
        PageRequest pageRequest
    ) {
        boolean filterAll = filter == NotificationFilter.all;
        if (decoded == null) {
            if (filterAll) {
                return userNotificationRepository.findInboxFirstPageAll(recipientId, pageRequest);
            }
            return userNotificationRepository.findInboxFirstPageFiltered(recipientId, types, pageRequest);
        }
        if (filterAll) {
            return userNotificationRepository.findInboxAfterCursorAll(
                recipientId,
                decoded.createdAt(),
                decoded.id(),
                pageRequest
            );
        }
        return userNotificationRepository.findInboxAfterCursorFiltered(
            recipientId,
            types,
            decoded.createdAt(),
            decoded.id(),
            pageRequest
        );
    }

    private void createVideoLikeBucket(User recipient, User actor, Video video) {
        UserNotificationEntity row = baseRow(recipient, actor, NotificationType.VIDEO_LIKE);
        row.setVideo(video);
        saveBucketWithActor(row, actor);
    }

    private void createCommentLikeBucket(
        User recipient,
        User actor,
        CommentEntity comment,
        Video video
    ) {
        UserNotificationEntity row = baseRow(recipient, actor, NotificationType.COMMENT_LIKE);
        row.setVideo(video);
        row.setComment(comment);
        row.setPreview(truncate(comment.getContent()));
        saveBucketWithActor(row, actor);
    }

    private void createCommentReplyBucket(
        User recipient,
        User actor,
        CommentEntity parent,
        Video video,
        String preview
    ) {
        UserNotificationEntity row = baseRow(recipient, actor, NotificationType.COMMENT_REPLY);
        row.setVideo(video);
        row.setComment(parent);
        row.setPreview(preview);
        saveBucketWithActor(row, actor);
    }

    private void createFollowBucket(User recipient, User actor) {
        UserNotificationEntity row = baseRow(recipient, actor, NotificationType.FOLLOW);
        saveBucketWithActor(row, actor);
    }

    private void createMentionBucket(
        User recipient,
        User actor,
        CommentEntity comment,
        Video video,
        String preview
    ) {
        UserNotificationEntity row = baseRow(recipient, actor, NotificationType.MENTION);
        row.setVideo(video);
        row.setComment(comment);
        row.setPreview(preview);
        saveBucketWithActor(row, actor);
    }

    private void saveBucketWithActor(UserNotificationEntity row, User actor) {
        row.setActorCount(1);
        userNotificationRepository.save(row);
        userNotificationActorRepository.save(
            UserNotificationActorEntity.of(row.getId(), actor.getId())
        );
        publishBucketUpdate(row);
    }

    private void appendActor(
        UserNotificationEntity bucket,
        User actor,
        String preview,
        boolean bumpWhenActorExists
    ) {
        boolean exists = userNotificationActorRepository.existsByNotificationIdAndActorId(
            bucket.getId(),
            actor.getId()
        );
        if (!exists) {
            userNotificationActorRepository.save(
                UserNotificationActorEntity.of(bucket.getId(), actor.getId())
            );
            bucket.setActorCount(bucket.getActorCount() + 1);
        } else if (!bumpWhenActorExists) {
            return;
        }
        if (preview != null) {
            bucket.setPreview(preview);
        }
        bucket.bumpActivity(actor);
        publishBucketUpdate(bucket);
    }

    private void removeActor(UserNotificationEntity bucket, Long actorId) {
        if (!userNotificationActorRepository.existsByNotificationIdAndActorId(bucket.getId(), actorId)) {
            return;
        }
        User recipient = bucket.getRecipient();
        long notificationId = bucket.getId();
        userNotificationActorRepository.deleteByNotificationIdAndActorId(bucket.getId(), actorId);
        long remaining = userNotificationActorRepository.countByNotificationId(bucket.getId());
        if (remaining <= 0) {
            userNotificationRepository.delete(bucket);
            publishBucketRemoved(recipient, notificationId);
            return;
        }
        bucket.setActorCount((int) remaining);
        userNotificationActorRepository
            .findFirstByNotificationIdOrderByCreatedAtDescActorIdDesc(bucket.getId())
            .map(UserNotificationActorEntity::getActorId)
            .flatMap(userRepository::findById)
            .ifPresent(latest -> {
                bucket.setActor(latest);
                bucket.setUpdatedAt(LocalDateTime.now());
            });
    }

    private void publishBucketUpdate(UserNotificationEntity bucket) {
        User recipient = bucket.getRecipient();
        if (recipient == null || recipient.getEmail() == null || recipient.getEmail().isBlank()) {
            return;
        }
        Long actorId = bucket.getActor() != null ? bucket.getActor().getId() : null;
        Set<Long> followedActorIds = actorId != null
            ? new HashSet<>(followRepository.findFollowingIdsForFollower(recipient.getId(), Set.of(actorId)))
            : Set.of();
        NotificationItemResponse item = toItem(bucket, followedActorIds);
        long unreadCount = userNotificationRepository.countByRecipient_IdAndReadAtIsNull(recipient.getId());
        realtimePublisher.publishUpdated(recipient.getEmail(), item, unreadCount);
    }

    private void publishBucketRemoved(User recipient, long notificationId) {
        if (recipient == null || recipient.getEmail() == null || recipient.getEmail().isBlank()) {
            return;
        }
        long unreadCount = userNotificationRepository.countByRecipient_IdAndReadAtIsNull(recipient.getId());
        realtimePublisher.publishRemoved(recipient.getEmail(), notificationId, unreadCount);
    }

    private UserNotificationEntity baseRow(User recipient, User actor, NotificationType type) {
        UserNotificationEntity row = new UserNotificationEntity();
        row.setRecipient(recipient);
        row.setActor(actor);
        row.setType(type);
        row.setActorCount(1);
        return row;
    }

    private NotificationItemResponse toItem(UserNotificationEntity row, Set<Long> followedActorIds) {
        User actor = row.getActor();
        Long actorId = actor != null ? actor.getId() : null;
        UUID videoPublicId = row.getVideo() != null ? row.getVideo().getPublicId() : null;
        String videoAuthorUsername = row.getVideo() != null && row.getVideo().getAuthor() != null
            ? row.getVideo().getAuthor().getUsername()
            : null;
        String videoThumbnailUrl = row.getVideo() != null
            ? mediaUrlPresigner.presignPlaybackUrl(row.getVideo().getThumbnailUrl())
            : null;
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
            videoAuthorUsername,
            videoThumbnailUrl,
            commentId,
            actorId != null && followedActorIds.contains(actorId),
            row.getReadAt() != null,
            row.getActorCount(),
            row.getCreatedAt(),
            row.getUpdatedAt()
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
