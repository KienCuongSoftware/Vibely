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
        tryEnqueue(videoId, false);
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
        tryEnqueue(videoId, false);
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
            tryEnqueue(videoId, true);
        }
    }

    @Transactional
    public void tryEnqueue(Long videoId, boolean allowOriginalityPending) {
        if (!properties.isEnabled() || videoId == null) {
            return;
        }
        Video video = videoRepository.findById(videoId).orElse(null);
        if (video == null || video.isStudioDraft()) {
            return;
        }

        UUID analysisJobId = latestCompletedAnalysisJobId(videoId);
        if (analysisJobId == null) {
            return;
        }

        Long originalityReportId = latestOriginalityReportId(videoId);
        boolean originalityPending = originalityReportId == null;
        if (originalityPending && !allowOriginalityPending) {
            return;
        }

        String policyVersion = properties.getPolicyVersion();
        if (jobRepository.existsIdempotent(videoId, policyVersion, analysisJobId, originalityReportId)) {
            return;
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
            return;
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
            "Enqueued moderation jobId={} videoId={} originalityPending={}",
            saved.getId(),
            videoId,
            originalityPending
        );
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
