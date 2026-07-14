package com.vibely.backend.contentunderstanding;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AnalysisJobRepository extends JpaRepository<AnalysisJobEntity, UUID> {

    Optional<AnalysisJobEntity> findFirstByVideo_IdOrderByCreatedAtDesc(Long videoId);

    List<AnalysisJobEntity> findByStatusAndLockedAtBefore(AnalysisJobStatus status, LocalDateTime before);

    @Query(
        value = """
            SELECT id FROM analysis_jobs
            WHERE status = 'PENDING'
            ORDER BY priority DESC, created_at ASC
            FOR UPDATE SKIP LOCKED
            LIMIT 1
            """,
        nativeQuery = true
    )
    Optional<UUID> lockNextPendingJobId();

    @Query("""
        select j from AnalysisJobEntity j
        join fetch j.video v
        join fetch v.author
        where j.id = :id
        """)
    Optional<AnalysisJobEntity> findWithVideoAndAuthorById(@Param("id") UUID id);
}
