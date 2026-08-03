package com.vibely.backend.enhancement;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EnhancementJobRepository extends JpaRepository<EnhancementJobEntity, UUID> {

    Optional<EnhancementJobEntity> findByIdempotencyKey(String idempotencyKey);

    @Query("""
        SELECT j FROM EnhancementJobEntity j
        JOIN FETCH j.video v
        JOIN FETCH v.author
        WHERE j.id = :id
        """)
    Optional<EnhancementJobEntity> findWithVideoAndAuthorById(@Param("id") UUID id);

    @Query(value = """
        SELECT id FROM enhancement_jobs
        WHERE state IN ('PENDING', 'QUEUED', 'RETRYING')
        ORDER BY created_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
        """, nativeQuery = true)
    Optional<UUID> lockNextPendingJobId();

    List<EnhancementJobEntity> findByVideo_IdOrderByCreatedAtDesc(Long videoId);

    @Query("""
        SELECT j FROM EnhancementJobEntity j
        WHERE j.leaseUntil IS NOT NULL
          AND j.leaseUntil < :now
          AND j.state IN (
            com.vibely.backend.enhancement.EnhancementJobState.DOWNLOADING,
            com.vibely.backend.enhancement.EnhancementJobState.AI_PROCESSING,
            com.vibely.backend.enhancement.EnhancementJobState.GENERATING_HLS,
            com.vibely.backend.enhancement.EnhancementJobState.UPLOADING
          )
        """)
    List<EnhancementJobEntity> findExpiredLeases(@Param("now") Instant now);
}
