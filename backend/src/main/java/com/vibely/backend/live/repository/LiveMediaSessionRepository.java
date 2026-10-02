package com.vibely.backend.live.repository;

import com.vibely.backend.live.entity.LiveMediaSession;
import com.vibely.backend.live.entity.LiveMediaSessionStatus;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/**
 * Every transition is a single conditional UPDATE, so concurrent hooks (SRS can call on_publish and
 * on_unpublish back to back) and health checks cannot overwrite each other.
 */
public interface LiveMediaSessionRepository extends JpaRepository<LiveMediaSession, Long> {

    Optional<LiveMediaSession> findByLiveId(Long liveId);

    Optional<LiveMediaSession> findByStreamName(String streamName);

    List<LiveMediaSession> findByStatusIn(Collection<LiveMediaSessionStatus> statuses);

    List<LiveMediaSession> findByCleanupPendingTrue();

    /** Replaces the publish credential; the previous one stops working immediately. */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Transactional
    @Query("""
        update LiveMediaSession s
        set s.publishTokenHash = :hash, s.publishTokenExpiresAt = :expiresAt
        where s.id = :id and s.status <> com.vibely.backend.live.entity.LiveMediaSessionStatus.ENDED
        """)
    int rotatePublishToken(@Param("id") Long id, @Param("hash") String hash, @Param("expiresAt") LocalDateTime expiresAt);

    /**
     * Accepts a publisher: consumes the credential (single use) only if it is still the current,
     * unexpired one. A PUBLISHING session may be taken over because SRS itself refuses a second
     * publisher while the stream is busy, so reaching this hook means the previous one is gone (its
     * on_unpublish may simply not have been processed yet).
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Transactional
    @Query("""
        update LiveMediaSession s
        set s.status = com.vibely.backend.live.entity.LiveMediaSessionStatus.PUBLISHING,
            s.publisherClientId = :clientId,
            s.lastPublishedAt = :now,
            s.disconnectedAt = null,
            s.publishTokenHash = null,
            s.publishTokenExpiresAt = null,
            s.publishCount = s.publishCount + 1
        where s.id = :id
          and s.publishTokenHash = :hash
          and s.publishTokenExpiresAt > :now
          and s.status <> com.vibely.backend.live.entity.LiveMediaSessionStatus.ENDED
        """)
    int markPublishing(
        @Param("id") Long id,
        @Param("hash") String hash,
        @Param("clientId") String clientId,
        @Param("now") LocalDateTime now
    );

    /** PUBLISHING -> INTERRUPTED, only for the client that currently owns the stream (or any, when null). */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Transactional
    @Query("""
        update LiveMediaSession s
        set s.status = com.vibely.backend.live.entity.LiveMediaSessionStatus.INTERRUPTED,
            s.disconnectedAt = :at
        where s.id = :id
          and s.status = com.vibely.backend.live.entity.LiveMediaSessionStatus.PUBLISHING
          and (:clientId is null or s.publisherClientId = :clientId)
        """)
    int markInterrupted(@Param("id") Long id, @Param("clientId") String clientId, @Param("at") LocalDateTime at);

    /** INTERRUPTED -> PUBLISHING when SRS still reports the same publisher (a stale or reordered on_unpublish). */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Transactional
    @Query("""
        update LiveMediaSession s
        set s.status = com.vibely.backend.live.entity.LiveMediaSessionStatus.PUBLISHING,
            s.disconnectedAt = null
        where s.id = :id
          and s.status = com.vibely.backend.live.entity.LiveMediaSessionStatus.INTERRUPTED
          and s.publisherClientId = :clientId
        """)
    int markRecovered(@Param("id") Long id, @Param("clientId") String clientId);

    /** Any open state -> ENDED; the credential is wiped and cleanup is flagged until SRS confirms it. */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Transactional
    @Query("""
        update LiveMediaSession s
        set s.status = com.vibely.backend.live.entity.LiveMediaSessionStatus.ENDED,
            s.endedAt = :now,
            s.publishTokenHash = null,
            s.publishTokenExpiresAt = null,
            s.cleanupPending = true
        where s.id = :id and s.status <> com.vibely.backend.live.entity.LiveMediaSessionStatus.ENDED
        """)
    int markEnded(@Param("id") Long id, @Param("now") LocalDateTime now);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Transactional
    @Query("update LiveMediaSession s set s.cleanupPending = false where s.id = :id")
    int markCleanedUp(@Param("id") Long id);
}
