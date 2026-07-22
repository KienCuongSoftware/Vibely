package com.vibely.backend.moderation;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vibely.backend.user.entity.User;
import com.vibely.backend.video.Video;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Đưa báo cáo video từ người dùng vào hàng đợi kiểm duyệt admin
 * ({@code moderation_review_queue}, reason = {@code USER_REPORT}).
 */
@Service
public class UserReportModerationService {

    private static final Logger log = LoggerFactory.getLogger(UserReportModerationService.class);
    private static final int USER_REPORT_PRIORITY = 180;
    private static final String ENGINE_VERSION = "user-report";
    /** Distinct from AI jobs so idx_moderation_jobs_idempotent does not collide. */
    private static final String USER_REPORT_POLICY_VERSION = "user-report";

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public UserReportModerationService(
        JdbcTemplate jdbcTemplate,
        ObjectMapper objectMapper
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public void enqueueUserReport(Video video, User reporter, String reason) {
        if (video == null || video.getId() == null) {
            return;
        }
        String trimmedReason = reason == null ? "" : reason.trim();
        if (trimmedReason.isEmpty()) {
            trimmedReason = "USER_REPORT";
        }
        Long reporterId = reporter == null ? null : reporter.getId();

        List<Map<String, Object>> openQueue = jdbcTemplate.queryForList(
            """
            SELECT id, report_id
            FROM moderation_review_queue
            WHERE video_id = ?
              AND reason = 'USER_REPORT'
              AND queue_state IN ('OPEN', 'CLAIMED')
            ORDER BY id DESC
            LIMIT 1
            """,
            video.getId()
        );

        if (!openQueue.isEmpty()) {
            long reportId = ((Number) openQueue.get(0).get("report_id")).longValue();
            insertEvidence(reportId, reporterId, trimmedReason);
            jdbcTemplate.update(
                """
                UPDATE moderation_review_queue
                SET priority = GREATEST(priority, ?), updated_at = NOW()
                WHERE id = ?
                """,
                USER_REPORT_PRIORITY,
                ((Number) openQueue.get(0).get("id")).longValue()
            );
            jdbcTemplate.update(
                """
                INSERT INTO moderation_audit_logs
                    (video_id, report_id, actor, action, before_json, after_json, created_at)
                VALUES (?, ?, ?, 'USER_REPORT_APPENDED', '{}'::jsonb, CAST(? AS jsonb), NOW())
                """,
                video.getId(),
                reportId,
                actorLabel(reporterId),
                toJson(Map.of(
                    "reason", trimmedReason,
                    "reporterUserId", reporterId == null ? "" : reporterId
                ))
            );
            log.info(
                "Appended user report evidence videoId={} reportId={} reporterId={}",
                video.getId(),
                reportId,
                reporterId
            );
            return;
        }

        String policyVersion = USER_REPORT_POLICY_VERSION;
        String explainJson = toJson(Map.of(
            "source", "USER_REPORT",
            "reason", trimmedReason,
            "reporterUserId", reporterId == null ? "" : reporterId,
            "reporterEmail", reporter == null || reporter.getEmail() == null ? "" : reporter.getEmail()
        ));

        Long jobId = jdbcTemplate.queryForObject(
            """
            INSERT INTO moderation_jobs
                (video_id, policy_version, job_state, originality_pending, attempts,
                 snapshot_json, created_at, updated_at)
            VALUES (?, ?, 'COMPLETED', FALSE, 0, CAST(? AS jsonb), NOW(), NOW())
            RETURNING id
            """,
            Long.class,
            video.getId(),
            policyVersion,
            toJson(Map.of("source", "USER_REPORT"))
        );

        Long reportId = jdbcTemplate.queryForObject(
            """
            INSERT INTO moderation_reports
                (job_id, video_id, policy_version, risk, confidence, decision, status,
                 override_applied, originality_pending, explain_json, engine_version,
                 created_at, updated_at)
            VALUES (?, ?, ?, 70, 1.0, 'REVIEW', 'OPEN', FALSE, FALSE,
                    CAST(? AS jsonb), ?, NOW(), NOW())
            RETURNING id
            """,
            Long.class,
            jobId,
            video.getId(),
            policyVersion,
            explainJson,
            ENGINE_VERSION
        );

        insertEvidence(reportId, reporterId, trimmedReason);

        Long queueId = jdbcTemplate.queryForObject(
            """
            INSERT INTO moderation_review_queue
                (video_id, report_id, priority, queue_state, reason, created_at, updated_at)
            VALUES (?, ?, ?, 'OPEN', 'USER_REPORT', NOW(), NOW())
            RETURNING id
            """,
            Long.class,
            video.getId(),
            reportId,
            USER_REPORT_PRIORITY
        );

        jdbcTemplate.update(
            """
            INSERT INTO moderation_audit_logs
                (video_id, report_id, actor, action, before_json, after_json, created_at)
            VALUES (?, ?, ?, 'USER_REPORT', '{}'::jsonb, CAST(? AS jsonb), NOW())
            """,
            video.getId(),
            reportId,
            actorLabel(reporterId),
            toJson(Map.of(
                "reason", trimmedReason,
                "queueId", queueId == null ? 0 : queueId,
                "jobId", jobId == null ? 0 : jobId,
                "reporterUserId", reporterId == null ? "" : reporterId
            ))
        );

        log.info(
            "Enqueued user report videoId={} reportId={} queueId={} reporterId={}",
            video.getId(),
            reportId,
            queueId,
            reporterId
        );
    }

    private void insertEvidence(Long reportId, Long reporterId, String reason) {
        jdbcTemplate.update(
            """
            INSERT INTO moderation_evidence
                (report_id, source_modality, reason_code, snippet, frame_index, time_ms,
                 weight, ref_json, created_at)
            VALUES (?, 'USER_REPORT', 'USER_REPORT', ?, NULL, NULL, 1.0, CAST(? AS jsonb), NOW())
            """,
            reportId,
            truncate(reason, 2000),
            toJson(Map.of(
                "reporterUserId", reporterId == null ? "" : reporterId
            ))
        );
    }

    private static String actorLabel(Long reporterId) {
        return reporterId == null ? "USER" : "USER:" + reporterId;
    }

    private static String truncate(String value, int max) {
        if (value == null) {
            return "";
        }
        return value.length() <= max ? value : value.substring(0, max);
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception ex) {
            return "{}";
        }
    }
}
