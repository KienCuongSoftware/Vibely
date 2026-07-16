package com.vibely.backend.originality;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OriginalityJobRepository extends JpaRepository<OriginalityJobEntity, Long> {

    Optional<OriginalityJobEntity> findByVideo_Id(Long videoId);

    java.util.List<OriginalityJobEntity> findByJobStateAndClaimedAtBefore(
        OriginalityJobState jobState,
        java.time.LocalDateTime claimedAt
    );

    java.util.List<OriginalityJobEntity> findByJobStateAndCreatedAtBefore(
        OriginalityJobState jobState,
        java.time.LocalDateTime createdAt
    );

    @Query(
        value = """
            SELECT id FROM originality_jobs
            WHERE job_state = 'PENDING'
            ORDER BY created_at ASC
            FOR UPDATE SKIP LOCKED
            LIMIT 1
            """,
        nativeQuery = true
    )
    Optional<Long> lockNextPendingJobId();

    @Query(
        """
        select j from OriginalityJobEntity j
        join fetch j.video v
        join fetch v.author
        where j.id = :id
        """
    )
    Optional<OriginalityJobEntity> findWithVideoAndAuthorById(@Param("id") Long id);
}
