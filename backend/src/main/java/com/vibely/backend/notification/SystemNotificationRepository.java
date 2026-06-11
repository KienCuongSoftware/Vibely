package com.vibely.backend.notification;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SystemNotificationRepository extends JpaRepository<SystemNotificationEntity, Long> {

    @Query(
        """
        select s from SystemNotificationEntity s
        where s.active = true
        order by s.createdAt desc, s.id desc
        """
    )
    List<SystemNotificationEntity> findActiveFirstPage(Pageable pageable);

    @Query(
        """
        select s from SystemNotificationEntity s
        where s.active = true
        and s.category = :category
        order by s.createdAt desc, s.id desc
        """
    )
    List<SystemNotificationEntity> findActiveFirstPageByCategory(
        @Param("category") SystemNotificationCategory category,
        Pageable pageable
    );

    @Query(
        """
        select s from SystemNotificationEntity s
        where s.active = true
        and (
            s.createdAt < :cursorCreatedAt
            or (s.createdAt = :cursorCreatedAt and s.id < :cursorId)
        )
        order by s.createdAt desc, s.id desc
        """
    )
    List<SystemNotificationEntity> findActiveAfterCursor(
        @Param("cursorCreatedAt") LocalDateTime cursorCreatedAt,
        @Param("cursorId") Long cursorId,
        Pageable pageable
    );

    @Query(
        """
        select s from SystemNotificationEntity s
        where s.active = true
        and s.category = :category
        and (
            s.createdAt < :cursorCreatedAt
            or (s.createdAt = :cursorCreatedAt and s.id < :cursorId)
        )
        order by s.createdAt desc, s.id desc
        """
    )
    List<SystemNotificationEntity> findActiveAfterCursorByCategory(
        @Param("category") SystemNotificationCategory category,
        @Param("cursorCreatedAt") LocalDateTime cursorCreatedAt,
        @Param("cursorId") Long cursorId,
        Pageable pageable
    );

    Optional<SystemNotificationEntity> findFirstByActiveTrueOrderByCreatedAtDescIdDesc();
}
