package com.vibely.backend.moderation;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vibely.backend.video.Video;
import com.vibely.backend.video.VideoRepository;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ModerationJoinService {

    private static final Logger log = LoggerFactory.getLogger(ModerationJoinService.class);

    private final ModerationProperties properties;
    private final ModerationJobRepository jobRepository;
    private final ModerationEventOutboxRepository outboxRepository;
    private final ModerationSnapshotBuilder snapshotBuilder;
    private final VideoRepository videoRepository;
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public ModerationJoinService(
        ModerationProperties properties,
        ModerationJobRepository jobRepository,
        ModerationEventOutboxRepository outboxRepository,
        ModerationSnapshotBuilder snapshotBuilder,
        VideoRepository videoRepository,
        JdbcTemplate jdbcTemplate,
        ObjectMapper objectMapper
    ) {
        this.properties = properties;
        this.jobRepository = jobRepository;
        this.outboxRepository = outboxRepository;
        this.snapshotBuilder = snapshotBuilder;
        this.videoRepository = videoRepository;
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public void onContentUnderstandingCompleted(Long videoId, UUID analysisJobId) {
        if (!properties.isEnabled() || videoId == null) {
            return;
        }
        writeDomainEvent(
            "analysis_job",
            analysisJobId == null ? String.valueOf(videoId) : analysisJobId.toString(),
            "content.understanding.completed.v1",
            Map.of(
                "eventType", "content.understanding.completed.v1",
                "videoId", videoId,
                "analysisJobId", analysisJobId == null ? null : analysisJobId.toString()
            )
        );
        // Prefer the job that just finished; force so a CU re-tag always gets a new evaluate.
        safeTryEnqueue(videoId, false, analysisJobId, true);
    }

    @Transactional
    public void onOriginalityCompleted(Long videoId, Long originalityReportId) {
        if (!properties.isEnabled() || videoId == null) {
            return;
        }
        writeDomainEvent(
            "originality_report",
            String.valueOf(originalityReportId),
            "originality.completed.v1",
            Map.of(
                "eventType", "originality.completed.v1",
                "videoId", videoId,
                "originalityReportId", originalityReportId
            )
        );
        safeTryEnqueue(videoId, false, null, false);
    }

    private void safeTryEnqueue(
        Long videoId,
        boolean allowOriginalityPending,
        UUID preferredAnalysisJobId,
        boolean force
    ) {
        try {
            tryEnqueue(videoId, allowOriginalityPending, preferredAnalysisJobId, force);
        } catch (Exception ex) {
            log.warn(
                "Moderation enqueue failed videoId={} allowPending={} force={}: {}",
                videoId,
                allowOriginalityPending,
                force,
                ex.getMessage(),
                ex
            );
        }
    }

    /**
     * Admin / ops: rebuild snapshot and enqueue a fresh PENDING moderation job
     * for the latest completed CU analysis (even if a COMPLETED job already exists).
     */
    @Transactional
    public Long forceReevaluate(Long videoId) {
        if (!properties.isEnabled() || videoId == null) {
            throw new IllegalStateException("Moderation is disabled.");
        }
        return tryEnqueue(videoId, true, null, true);
    }

    /** Soft-timeout path: CU done, originality still missing past deadline. */
    @Transactional
    public void reconcileSoftTimeouts() {
        if (!properties.isEnabled()) {
            return;
        }
        int minutes = Math.max(1, properties.getOriginalitySoftTimeoutMinutes());
        List<Map<String, Object>> candidates = jdbcTemplate.queryForList(
            """
            SELECT aj.video_id AS video_id, aj.id AS analysis_job_id
            FROM analysis_jobs aj
            WHERE aj.status = 'COMPLETED'
              AND aj.finished_at IS NOT NULL
              AND aj.finished_at < NOW() - (INTERVAL '1 minute' * ?)
              AND NOT EXISTS (
                  SELECT 1 FROM originality_reports r WHERE r.video_id = aj.video_id
              )
              AND NOT EXISTS (
                  SELECT 1 FROM moderation_jobs mj
                  WHERE mj.video_id = aj.video_id
                    AND mj.policy_version = ?
                    AND mj.job_state IN ('PENDING', 'PROCESSING', 'COMPLETED')
                    AND mj.analysis_job_id = aj.id
              )
            ORDER BY aj.finished_at ASC
            LIMIT 50
            """,
            minutes,
            properties.getPolicyVersion()
        );
        for (Map<String, Object> row : candidates) {
            Long videoId = ((Number) row.get("video_id")).longValue();
            tryEnqueue(videoId, true, null, false);
        }
    }

    /**
     * Backfill: CU + originality already complete but moderation job never enqueued
     * for the latest CU analysis (missed join, or CU re-run after an older COMPLETED mod job).
     */
    @Transactional
    public void reconcileMissingModerationJobs() {
        if (!properties.isEnabled()) {
            return;
        }
        List<Map<String, Object>> candidates = jdbcTemplate.queryForList(
            """
            SELECT aj.video_id AS video_id, aj.id AS analysis_job_id
            FROM analysis_jobs aj
            JOIN originality_reports o ON o.video_id = aj.video_id
            JOIN videos v ON v.id = aj.video_id
            WHERE aj.status = 'COMPLETED'
              AND COALESCE(v.studio_draft, FALSE) = FALSE
              AND aj.id = (
                  SELECT aj2.id FROM analysis_jobs aj2
                  WHERE aj2.video_id = aj.video_id AND aj2.status = 'COMPLETED'
                  ORDER BY aj2.finished_at DESC NULLS LAST, aj2.created_at DESC
                  LIMIT 1
              )
              AND NOT EXISTS (
                  SELECT 1 FROM moderation_jobs mj
                  WHERE mj.video_id = aj.video_id
                    AND mj.policy_version = ?
                    AND mj.job_state IN ('PENDING', 'PROCESSING', 'COMPLETED')
                    AND mj.analysis_job_id = aj.id
              )
            ORDER BY aj.finished_at DESC NULLS LAST
            LIMIT 50
            """,
            properties.getPolicyVersion()
        );
        for (Map<String, Object> row : candidates) {
            Long videoId = ((Number) row.get("video_id")).longValue();
            Object aj = row.get("analysis_job_id");
            UUID analysisJobId = aj == null ? null : UUID.fromString(String.valueOf(aj));
            try {
                Long jobId = tryEnqueue(videoId, false, analysisJobId, false);
                if (jobId != null) {
                    log.info("Reconcile enqueued missing moderation job videoId={} jobId={}", videoId, jobId);
                }
            } catch (Exception ex) {
                log.warn("Reconcile enqueue failed videoId={}: {}", videoId, ex.getMessage());
            }
        }
    }

    @Transactional
    public void tryEnqueue(Long videoId, boolean allowOriginalityPending) {
        tryEnqueue(videoId, allowOriginalityPending, null, false);
    }

    /**
     * @return new job id, or null if skipped
     */
    @Transactional
    public Long tryEnqueue(
        Long videoId,
        boolean allowOriginalityPending,
        UUID preferredAnalysisJobId,
        boolean force
    ) {
        if (!properties.isEnabled() || videoId == null) {
            return null;
        }
        Video video = videoRepository.findById(videoId).orElse(null);
        if (video == null || video.isStudioDraft()) {
            return null;
        }

        UUID analysisJobId = preferredAnalysisJobId != null
            ? preferredAnalysisJobId
            : latestCompletedAnalysisJobId(videoId);
        if (analysisJobId == null) {
            analysisJobId = latestCompletedAnalysisJobId(videoId);
        }
        if (analysisJobId == null) {
            log.debug("Moderation enqueue skip videoId={}: no completed analysis job", videoId);
            return null;
        }

        Long originalityReportId = latestOriginalityReportId(videoId);
        boolean originalityPending = originalityReportId == null;
        if (originalityPending && !allowOriginalityPending) {
            log.debug("Moderation enqueue skip videoId={}: originality still pending", videoId);
            return null;
        }

        String policyVersion = properties.getPolicyVersion();
        if (!force && jobRepository.existsIdempotent(videoId, policyVersion, analysisJobId, originalityReportId)) {
            return null;
        }
        if (force) {
            // Active PENDING/PROCESSING for same key — refresh snapshot instead of duplicating.
            OptionalActiveJob active = findActiveJob(videoId, policyVersion, analysisJobId, originalityReportId);
            if (active != null) {
                Map<String, Object> snapshot = snapshotBuilder.build(
                    video,
                    analysisJobId,
                    originalityReportId,
                    originalityPending
                );
                jdbcTemplate.update(
                    """
                    UPDATE moderation_jobs
                    SET snapshot_json = CAST(? AS jsonb), originality_pending = ?, updated_at = NOW()
                    WHERE id = ?
                    """,
                    snapshotBuilder.toJson(snapshot),
                    originalityPending,
                    active.id()
                );
                Map<String, Object> refreshPayload = new HashMap<>();
                refreshPayload.put("eventType", "moderation.evaluate.requested");
                refreshPayload.put("jobId", active.id());
                refreshPayload.put("videoId", videoId);
                refreshPayload.put("policyVersion", policyVersion);
                refreshPayload.put("originalityPending", originalityPending);
                refreshPayload.put("refreshed", true);
                writeDomainEvent(
                    "moderation_job",
                    String.valueOf(active.id()),
                    "moderation.evaluate.requested",
                    refreshPayload
                );
                log.info(
                    "Refreshed active moderation jobId={} videoId={} force={}",
                    active.id(),
                    videoId,
                    force
                );
                return active.id();
            }
        }

        Map<String, Object> snapshot = snapshotBuilder.build(
            video,
            analysisJobId,
            originalityReportId,
            originalityPending
        );

        ModerationJobEntity job = new ModerationJobEntity();
        job.setVideo(video);
        job.setAnalysisJobId(analysisJobId);
        job.setOriginalityReportId(originalityReportId);
        job.setPolicyVersion(policyVersion);
        job.setJobState(ModerationJobState.PENDING);
        job.setOriginalityPending(originalityPending);
        job.setSnapshotJson(snapshotBuilder.toJson(snapshot));
        ModerationJobEntity saved;
        try {
            saved = jobRepository.saveAndFlush(job);
        } catch (DataIntegrityViolationException dup) {
            log.debug(
                "Moderation job already exists videoId={} policy={}",
                videoId,
                policyVersion
            );
            return null;
        }

        writeDomainEvent(
            "moderation_job",
            String.valueOf(saved.getId()),
            "moderation.evaluate.requested",
            Map.of(
                "eventType", "moderation.evaluate.requested",
                "jobId", saved.getId(),
                "videoId", videoId,
                "policyVersion", policyVersion,
                "originalityPending", originalityPending
            )
        );
        log.info(
            "Enqueued moderation jobId={} videoId={} analysisJobId={} originalityPending={} force={}",
            saved.getId(),
            videoId,
            analysisJobId,
            originalityPending,
            force
        );
        return saved.getId();
    }

    private OptionalActiveJob findActiveJob(
        Long videoId,
        String policyVersion,
        UUID analysisJobId,
        Long originalityReportId
    ) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
            """
            SELECT id FROM moderation_jobs
            WHERE video_id = ?
              AND policy_version = ?
              AND job_state IN ('PENDING', 'PROCESSING')
              AND COALESCE(analysis_job_id::text, '') = COALESCE(CAST(? AS text), '')
              AND COALESCE(originality_report_id::text, '') = COALESCE(CAST(? AS text), '')
            ORDER BY id DESC
            LIMIT 1
            """,
            videoId,
            policyVersion,
            analysisJobId == null ? null : analysisJobId.toString(),
            originalityReportId == null ? null : originalityReportId.toString()
        );
        if (rows.isEmpty()) {
            return null;
        }
        return new OptionalActiveJob(((Number) rows.get(0).get("id")).longValue());
    }

    private record OptionalActiveJob(long id) {
    }

    private UUID latestCompletedAnalysisJobId(Long videoId) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
            """
            SELECT id FROM analysis_jobs
            WHERE video_id = ? AND status = 'COMPLETED'
            ORDER BY finished_at DESC NULLS LAST, created_at DESC
            LIMIT 1
            """,
            videoId
        );
        if (rows.isEmpty()) {
            return null;
        }
        Object id = rows.get(0).get("id");
        return id == null ? null : UUID.fromString(String.valueOf(id));
    }

    private Long latestOriginalityReportId(Long videoId) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
            "SELECT id FROM originality_reports WHERE video_id = ? LIMIT 1",
            videoId
        );
        if (rows.isEmpty()) {
            return null;
        }
        return ((Number) rows.get(0).get("id")).longValue();
    }

    private void writeDomainEvent(
        String aggregateType,
        String aggregateId,
        String eventType,
        Map<String, Object> payload
    ) {
        ModerationEventOutboxEntity event = new ModerationEventOutboxEntity();
        event.setAggregateType(aggregateType);
        event.setAggregateId(aggregateId);
        event.setEventType(eventType);
        try {
            Map<String, Object> body = new HashMap<>(payload);
            body.putIfAbsent("createdAt", LocalDateTime.now().toString());
            event.setPayload(objectMapper.writeValueAsString(body));
        } catch (JsonProcessingException e) {
            event.setPayload("{}");
        }
        outboxRepository.save(event);
    }
}
