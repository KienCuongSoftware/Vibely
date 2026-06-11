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
        join fetch n.actor
        left join fetch n.video
        left join fetch n.comment
        where n.recipient.id = :recipientId
        and (:filterAll = true or n.type in :types)
        and (
            :cursorCreatedAt is null
            or n.createdAt < :cursorCreatedAt
            or (n.createdAt = :cursorCreatedAt and n.id < :cursorId)
        )
        order by n.createdAt desc, n.id desc
        """
    )
    List<UserNotificationEntity> findInboxPage(
        @Param("recipientId") Long recipientId,
        @Param("filterAll") boolean filterAll,
        @Param("types") List<NotificationType> types,
        @Param("cursorCreatedAt") LocalDateTime cursorCreatedAt,
        @Param("cursorId") Long cursorId,
        Pageable pageable
    );

    Optional<UserNotificationEntity> findByIdAndRecipient_Id(Long id, Long recipientId);

    long countByRecipient_IdAndReadAtIsNull(Long recipientId);

    boolean existsByRecipient_IdAndActor_IdAndTypeAndVideo_Id(
        Long recipientId,
        Long actorId,
        NotificationType type,
        Long videoId
    );

    boolean existsByRecipient_IdAndActor_IdAndTypeAndComment_Id(
        Long recipientId,
        Long actorId,
        NotificationType type,
        Long commentId
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
