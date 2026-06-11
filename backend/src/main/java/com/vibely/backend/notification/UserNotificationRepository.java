package com.vibely.backend.notification;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserNotificationRepository extends JpaRepository<UserNotificationEntity, Long> {

    @Query(
        """
        select n from UserNotificationEntity n
        left join fetch n.actor
        left join fetch n.video v
        left join fetch v.author
        left join fetch n.comment
        where n.recipient.id = :recipientId
        order by n.updatedAt desc, n.id desc
        """
    )
    List<UserNotificationEntity> findInboxFirstPageAll(
        @Param("recipientId") Long recipientId,
        Pageable pageable
    );

    @Query(
        """
        select n from UserNotificationEntity n
        left join fetch n.actor
        left join fetch n.video v
        left join fetch v.author
        left join fetch n.comment
        where n.recipient.id = :recipientId
        and n.type in :types
        order by n.updatedAt desc, n.id desc
        """
    )
    List<UserNotificationEntity> findInboxFirstPageFiltered(
        @Param("recipientId") Long recipientId,
        @Param("types") List<NotificationType> types,
        Pageable pageable
    );

    @Query(
        """
        select n from UserNotificationEntity n
        left join fetch n.actor
        left join fetch n.video v
        left join fetch v.author
        left join fetch n.comment
        where n.recipient.id = :recipientId
        and (
            n.updatedAt < :cursorUpdatedAt
            or (n.updatedAt = :cursorUpdatedAt and n.id < :cursorId)
        )
        order by n.updatedAt desc, n.id desc
        """
    )
    List<UserNotificationEntity> findInboxAfterCursorAll(
        @Param("recipientId") Long recipientId,
        @Param("cursorUpdatedAt") LocalDateTime cursorUpdatedAt,
        @Param("cursorId") Long cursorId,
        Pageable pageable
    );

    @Query(
        """
        select n from UserNotificationEntity n
        left join fetch n.actor
        left join fetch n.video v
        left join fetch v.author
        left join fetch n.comment
        where n.recipient.id = :recipientId
        and n.type in :types
        and (
            n.updatedAt < :cursorUpdatedAt
            or (n.updatedAt = :cursorUpdatedAt and n.id < :cursorId)
        )
        order by n.updatedAt desc, n.id desc
        """
    )
    List<UserNotificationEntity> findInboxAfterCursorFiltered(
        @Param("recipientId") Long recipientId,
        @Param("types") List<NotificationType> types,
        @Param("cursorUpdatedAt") LocalDateTime cursorUpdatedAt,
        @Param("cursorId") Long cursorId,
        Pageable pageable
    );

    Optional<UserNotificationEntity> findByIdAndRecipient_Id(Long id, Long recipientId);

    long countByRecipient_IdAndReadAtIsNull(Long recipientId);

    @Query(
        """
        select n from UserNotificationEntity n
        where n.recipient.id = :recipientId
        and n.type = :type
        and n.video.id = :videoId
        """
    )
    Optional<UserNotificationEntity> findVideoLikeBucket(
        @Param("recipientId") Long recipientId,
        @Param("videoId") Long videoId,
        @Param("type") NotificationType type
    );

    @Query(
        """
        select n from UserNotificationEntity n
        where n.recipient.id = :recipientId
        and n.type = :type
        and n.comment.id = :commentId
        """
    )
    Optional<UserNotificationEntity> findCommentBucket(
        @Param("recipientId") Long recipientId,
        @Param("commentId") Long commentId,
        @Param("type") NotificationType type
    );

    @Query(
        """
        select n from UserNotificationEntity n
        where n.recipient.id = :recipientId
        and n.type = :type
        and n.video is null
        and n.comment is null
        """
    )
    Optional<UserNotificationEntity> findFollowBucket(
        @Param("recipientId") Long recipientId,
        @Param("type") NotificationType type
    );

    @Query(
        """
        select n from UserNotificationEntity n
        where n.recipient.id = :recipientId
        and n.type = :type
        and n.video.id = :videoId
        """
    )
    Optional<UserNotificationEntity> findMentionBucket(
        @Param("recipientId") Long recipientId,
        @Param("videoId") Long videoId,
        @Param("type") NotificationType type
    );

    boolean existsByRecipient_IdAndActor_IdAndType(
        Long recipientId,
        Long actorId,
        NotificationType type
    );

    @Modifying
    @Query(
        """
        update UserNotificationEntity n
        set n.readAt = :readAt
        where n.recipient.id = :recipientId
        and n.id in :ids
        and n.readAt is null
        """
    )
    int markReadBatch(
        @Param("recipientId") Long recipientId,
        @Param("ids") Collection<Long> ids,
        @Param("readAt") LocalDateTime readAt
    );
}
