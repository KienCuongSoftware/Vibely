package com.vibely.backend.live.repository;

import com.vibely.backend.live.entity.LiveRecording;
import com.vibely.backend.live.entity.LiveRecordingStatus;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/**
 * Every transition is a conditional UPDATE on the expected state, so a hook, the worker and a retry
 * can race without processing a recording twice or moving it backwards.
 */
public interface LiveRecordingRepository extends JpaRepository<LiveRecording, Long> {

    Optional<LiveRecording> findByLiveId(Long liveId);

    List<LiveRecording> findByStatus(LiveRecordingStatus status);

    @Query("select r from LiveRecording r where r.status = com.vibely.backend.live.entity.LiveRecordingStatus.READY and r.videoId is null")
    List<LiveRecording> findReadyWithoutVideo();

    @Query("select v.id from Video v where v.videoUrl = :url")
    List<Long> findVideoIdsByUrl(@Param("url") String url);

    /** First LIVE end wins; later calls (system retry, duplicate end) keep the original time. */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Transactional
    @Query("""
        update LiveRecording r
        set r.liveEndedAt = :endedAt, r.updatedAt = :endedAt
        where r.liveId = :liveId and r.liveEndedAt is null
        """)
    int markLiveEnded(@Param("liveId") Long liveId, @Param("endedAt") LocalDateTime endedAt);

    /** RECORDING -> PROCESSING once the LIVE has been over for the settle delay. */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Transactional
    @Query("""
        update LiveRecording r
        set r.status = com.vibely.backend.live.entity.LiveRecordingStatus.PROCESSING,
            r.processingStartedAt = :now,
            r.attempts = r.attempts + 1,
            r.updatedAt = :now
        where r.id = :id
          and r.status = com.vibely.backend.live.entity.LiveRecordingStatus.RECORDING
          and r.liveEndedAt is not null
          and r.liveEndedAt <= :settledBefore
        """)
    int claimForProcessing(@Param("id") Long id, @Param("now") LocalDateTime now, @Param("settledBefore") LocalDateTime settledBefore);

    /**
     * Takes a PROCESSING recording again (released for retry, or abandoned by a crashed process);
     * the attempt budget is enforced here so a failing file cannot loop forever.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Transactional
    @Query("""
        update LiveRecording r
        set r.processingStartedAt = :now, r.attempts = r.attempts + 1, r.updatedAt = :now
        where r.id = :id
          and r.status = com.vibely.backend.live.entity.LiveRecordingStatus.PROCESSING
          and r.videoId is null
          and r.attempts < :maxAttempts
          and (r.processingStartedAt is null or r.processingStartedAt < :staleBefore)
        """)
    int reclaim(
        @Param("id") Long id,
        @Param("now") LocalDateTime now,
        @Param("staleBefore") LocalDateTime staleBefore,
        @Param("maxAttempts") int maxAttempts
    );

    /** After a failed attempt with budget left: picked up again by the next worker pass. */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Transactional
    @Query("""
        update LiveRecording r
        set r.processingStartedAt = null, r.updatedAt = :now
        where r.id = :id
          and r.status = com.vibely.backend.live.entity.LiveRecordingStatus.PROCESSING
          and r.videoId is null
        """)
    int releaseForRetry(@Param("id") Long id, @Param("now") LocalDateTime now);

    /** The remuxed file is in S3 and its draft video exists; the video pipeline takes over. */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Transactional
    @Query("""
        update LiveRecording r
        set r.storageKey = :storageKey,
            r.videoId = :videoId,
            r.durationSeconds = :durationSeconds,
            r.sizeBytes = :sizeBytes,
            r.failureReason = null,
            r.updatedAt = :now
        where r.id = :id
          and r.status = com.vibely.backend.live.entity.LiveRecordingStatus.PROCESSING
          and r.videoId is null
        """)
    int markUploaded(
        @Param("id") Long id,
        @Param("storageKey") String storageKey,
        @Param("videoId") Long videoId,
        @Param("durationSeconds") Integer durationSeconds,
        @Param("sizeBytes") Long sizeBytes,
        @Param("now") LocalDateTime now
    );

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Transactional
    @Query("""
        update LiveRecording r
        set r.status = com.vibely.backend.live.entity.LiveRecordingStatus.READY,
            r.readyAt = :now,
            r.updatedAt = :now
        where r.id = :id
          and r.status = com.vibely.backend.live.entity.LiveRecordingStatus.PROCESSING
          and r.videoId is not null
        """)
    int markReady(@Param("id") Long id, @Param("now") LocalDateTime now);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Transactional
    @Query("""
        update LiveRecording r
        set r.status = com.vibely.backend.live.entity.LiveRecordingStatus.FAILED,
            r.failureReason = :reason,
            r.updatedAt = :now
        where r.id = :id
          and r.status in (com.vibely.backend.live.entity.LiveRecordingStatus.RECORDING,
                           com.vibely.backend.live.entity.LiveRecordingStatus.PROCESSING)
        """)
    int markFailed(@Param("id") Long id, @Param("reason") String reason, @Param("now") LocalDateTime now);

    /** The host deleted the replay video. */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Transactional
    @Query("""
        update LiveRecording r
        set r.status = com.vibely.backend.live.entity.LiveRecordingStatus.DELETED,
            r.videoId = null,
            r.updatedAt = :now
        where r.id = :id
          and r.status in (com.vibely.backend.live.entity.LiveRecordingStatus.PROCESSING,
                           com.vibely.backend.live.entity.LiveRecordingStatus.READY)
        """)
    int markDeleted(@Param("id") Long id, @Param("now") LocalDateTime now);
}
