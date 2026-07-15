package com.vibely.backend.moderation;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ModerationJobRepository extends JpaRepository<ModerationJobEntity, Long> {

    Optional<ModerationJobEntity> findByVideo_IdAndPolicyVersionAndAnalysisJobIdAndOriginalityReportId(
        Long videoId,
        String policyVersion,
        UUID analysisJobId,
        Long originalityReportId
    );

    List<ModerationJobEntity> findByJobStateAndClaimedAtBefore(
        ModerationJobState jobState,
        LocalDateTime claimedAt
    );

    @Query(
        value = """
            SELECT id FROM moderation_jobs
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
        select j from ModerationJobEntity j
        join fetch j.video v
        join fetch v.author
        where j.id = :id
        """
    )
    Optional<ModerationJobEntity> findWithVideoAndAuthorById(@Param("id") Long id);

    @Query(
        value = """
            SELECT EXISTS(
                SELECT 1 FROM moderation_jobs
                WHERE video_id = :videoId
                  AND policy_version = :policyVersion
                  AND job_state IN ('PENDING', 'PROCESSING', 'COMPLETED')
                  AND COALESCE(analysis_job_id::text, '') = COALESCE(CAST(:analysisJobId AS text), '')
                  AND COALESCE(originality_report_id::text, '') = COALESCE(CAST(:originalityReportId AS text), '')
            )
            """,
        nativeQuery = true
    )
    boolean existsIdempotent(
        @Param("videoId") Long videoId,
        @Param("policyVersion") String policyVersion,
        @Param("analysisJobId") UUID analysisJobId,
        @Param("originalityReportId") Long originalityReportId
    );
}
