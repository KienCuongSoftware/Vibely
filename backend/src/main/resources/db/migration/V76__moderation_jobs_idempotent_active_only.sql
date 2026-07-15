-- Allow a new PENDING moderation job after a prior COMPLETED run for the same
-- (video, policy, analysis_job, originality) key — needed when CU re-tags
-- and plugins must re-evaluate. Active jobs remain unique.
DROP INDEX IF EXISTS idx_moderation_jobs_idempotent;

CREATE UNIQUE INDEX IF NOT EXISTS idx_moderation_jobs_idempotent
    ON moderation_jobs (
        video_id,
        policy_version,
        COALESCE(analysis_job_id::text, ''),
        COALESCE(originality_report_id::text, '')
    )
    WHERE job_state IN ('PENDING', 'PROCESSING');
