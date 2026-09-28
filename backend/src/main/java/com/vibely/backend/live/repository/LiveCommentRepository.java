package com.vibely.backend.live.repository;

import com.vibely.backend.live.entity.LiveComment;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface LiveCommentRepository extends JpaRepository<LiveComment, Long> {

    /** Newest-first page of visible comments, optionally older than {@code beforeId}. */
    @Query("""
        select c from LiveComment c
        join fetch c.author
        where c.live.id = :liveId
          and c.deletedAt is null
          and (:beforeId is null or c.id < :beforeId)
        order by c.id desc
        """)
    List<LiveComment> findRecent(
        @Param("liveId") Long liveId,
        @Param("beforeId") Long beforeId,
        Pageable pageable
    );

    /** Oldest-first comments newer than {@code afterId} (used by clients polling without WebSocket). */
    @Query("""
        select c from LiveComment c
        join fetch c.author
        where c.live.id = :liveId
          and c.deletedAt is null
          and c.id > :afterId
        order by c.id asc
        """)
    List<LiveComment> findAfter(
        @Param("liveId") Long liveId,
        @Param("afterId") Long afterId,
        Pageable pageable
    );

    @Query("select c from LiveComment c join fetch c.author where c.id = :id and c.live.id = :liveId")
    Optional<LiveComment> findInLive(@Param("id") Long id, @Param("liveId") Long liveId);

    /** Soft delete; returns 0 when the comment was already deleted. */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Transactional
    @Query("""
        update LiveComment c
        set c.deletedAt = :now, c.deletedByUserId = :actorId
        where c.id = :id and c.deletedAt is null
        """)
    int softDelete(@Param("id") Long id, @Param("actorId") Long actorId, @Param("now") LocalDateTime now);
}
