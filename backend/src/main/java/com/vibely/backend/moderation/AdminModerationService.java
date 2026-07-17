package com.vibely.backend.moderation;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vibely.backend.common.BadRequestException;
import com.vibely.backend.common.NotFoundException;
import com.vibely.backend.video.Video;
import com.vibely.backend.video.VideoPublicIds;
import com.vibely.backend.video.VideoRepository;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminModerationService {

    private final JdbcTemplate jdbcTemplate;
    private final ModerationReportRepository reportRepository;
    private final ModerationDecisionApplier decisionApplier;
    private final ModerationEventOutboxRepository outboxRepository;
    private final VideoRepository videoRepository;
    private final CreatorTrustService trustService;
    private final ModerationJoinService joinService;
    private final ObjectMapper objectMapper;

    public AdminModerationService(
        JdbcTemplate jdbcTemplate,
        ModerationReportRepository reportRepository,
        ModerationDecisionApplier decisionApplier,
        ModerationEventOutboxRepository outboxRepository,
        VideoRepository videoRepository,
        CreatorTrustService trustService,
        ModerationJoinService joinService,
        ObjectMapper objectMapper
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.reportRepository = reportRepository;
        this.decisionApplier = decisionApplier;
        this.outboxRepository = outboxRepository;
        this.videoRepository = videoRepository;
        this.trustService = trustService;
        this.joinService = joinService;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public AdminModerationQueuePageResponse listQueue(int page, int size, String state) {
        int safePage = Math.max(0, page);
        int safeSize = Math.min(100, Math.max(1, size));
        int offset = safePage * safeSize;

        String stateFilter = state == null || state.isBlank()
            ? null
            : state.trim().toUpperCase(Locale.ROOT);

        boolean activeQueue = stateFilter == null
            || "OPEN".equals(stateFilter)
            || "CLAIMED".equals(stateFilter);

        String where = stateFilter == null
            ? "WHERE q.queue_state IN ('OPEN', 'CLAIMED')"
            : "WHERE q.queue_state = ?";
        // Soft-deleted videos stay in DB as REMOVED; hide them from the live review queue.
        if (activeQueue) {
            where += " AND v.status <> 'REMOVED'";
        }

        try {
            String countSql = """
                SELECT COUNT(*)
                FROM moderation_review_queue q
                JOIN videos v ON v.id = q.video_id
                %s
                """.formatted(where);
            Long total = stateFilter == null
                ? jdbcTemplate.queryForObject(countSql, Long.class)
                : jdbcTemplate.queryForObject(countSql, Long.class, stateFilter);
            if (total == null) {
                total = 0L;
            }

            String sql = """
                SELECT q.id AS queue_id, q.video_id, q.report_id, q.priority, q.queue_state, q.reason,
                       q.claimed_by, q.created_at,
                       v.public_id, v.title, v.thumbnail_url,
                       u.username AS author_username,
                       r.decision AS ai_decision, r.risk, r.confidence, r.status AS report_status
                FROM moderation_review_queue q
                JOIN videos v ON v.id = q.video_id
                JOIN users u ON u.id = v.author_id
                LEFT JOIN moderation_reports r ON r.id = q.report_id
                %s
                ORDER BY q.priority DESC, q.created_at ASC
                LIMIT ? OFFSET ?
                """.formatted(where);

            List<Map<String, Object>> rows = stateFilter == null
                ? jdbcTemplate.queryForList(sql, safeSize, offset)
                : jdbcTemplate.queryForList(sql, stateFilter, safeSize, offset);

            List<AdminModerationQueueItemResponse> items = new ArrayList<>();
            for (Map<String, Object> row : rows) {
                Object publicId = row.get("public_id");
                String reportStatus = row.get("report_status") == null
                    ? ""
                    : String.valueOf(row.get("report_status"));
                items.add(
                    new AdminModerationQueueItemResponse(
                        asLong(row.get("queue_id"), 0L),
                        asLong(row.get("video_id"), 0L),
                        publicId == null ? null : String.valueOf(publicId),
                        (String) row.get("title"),
                        (String) row.get("thumbnail_url"),
                        (String) row.get("author_username"),
                        asLong(row.get("report_id"), 0L),
                        row.get("ai_decision") == null ? "REVIEW" : String.valueOf(row.get("ai_decision")),
                        asInt(row.get("risk"), 0),
                        asDouble(row.get("confidence"), 0.0),
                        String.valueOf(row.get("queue_state")),
                        asInt(row.get("priority"), 0),
                        row.get("reason") == null ? "" : String.valueOf(row.get("reason")),
                        (String) row.get("claimed_by"),
                        row.get("created_at") == null ? null : String.valueOf(row.get("created_at")),
                        "SHADOW".equalsIgnoreCase(reportStatus)
                    )
                );
            }
            boolean hasNext = (long) (safePage + 1) * safeSize < total;
            return new AdminModerationQueuePageResponse(items, total, safePage, safeSize, hasNext);
        } catch (DataAccessException ex) {
            String msg = ex.getMostSpecificCause() == null
                ? ex.getMessage()
                : ex.getMostSpecificCause().getMessage();
            if (msg != null && msg.toLowerCase(Locale.ROOT).contains("moderation_review_queue")) {
                throw new BadRequestException(
                    "Schema kiểm duyệt chưa sẵn sàng. Hãy chạy Flyway V67 rồi restart backend."
                );
            }
            throw new BadRequestException(
                "Không đọc được hàng đợi kiểm duyệt: " + (msg == null ? "lỗi DB" : msg)
            );
        }
    }

    @Transactional
    public AdminModerationQueueItemResponse claim(long queueId, String adminLabel) {
        Map<String, Object> row = loadQueueRow(queueId);
        String state = String.valueOf(row.get("queue_state"));
        if ("RESOLVED".equals(state) || "DISMISSED".equals(state)) {
            throw new BadRequestException("Mục hàng đợi đã đóng.");
        }
        String claimedBy = (String) row.get("claimed_by");
        if ("CLAIMED".equals(state) && claimedBy != null && !claimedBy.equals(adminLabel)) {
            throw new BadRequestException("Mục đang được claim bởi " + claimedBy);
        }
        jdbcTemplate.update(
            """
            UPDATE moderation_review_queue
            SET queue_state = 'CLAIMED', claimed_by = ?, claimed_at = NOW(), updated_at = NOW()
            WHERE id = ?
            """,
            adminLabel,
            queueId
        );
        return toQueueItem(loadQueueRow(queueId));
    }

    @Transactional
    public AdminModerationDetailResponse resolve(
        long queueId,
        AdminModerationResolveRequest request,
        Long adminUserId,
        String adminLabel
    ) {
        Map<String, Object> row = loadQueueRow(queueId);
        String state = String.valueOf(row.get("queue_state"));
        if ("RESOLVED".equals(state) || "DISMISSED".equals(state)) {
            throw new BadRequestException("Mục hàng đợi đã đóng.");
        }
        String claimedBy = (String) row.get("claimed_by");
        if ("CLAIMED".equals(state) && claimedBy != null && !claimedBy.equals(adminLabel)) {
            throw new BadRequestException("Chỉ người claim mới được resolve.");
        }
        if (!"CLAIMED".equals(state)) {
            jdbcTemplate.update(
                """
                UPDATE moderation_review_queue
                SET queue_state = 'CLAIMED', claimed_by = ?, claimed_at = NOW(), updated_at = NOW()
                WHERE id = ?
                """,
                adminLabel,
                queueId
            );
        }

        ModerationDecision decision;
        try {
            decision = request.parsedDecision();
        } catch (Exception e) {
            throw new BadRequestException("decision không hợp lệ");
        }

        long reportId = ((Number) row.get("report_id")).longValue();
        long videoId = ((Number) row.get("video_id")).longValue();
        ModerationReportEntity report = reportRepository
            .findById(reportId)
            .orElseThrow(() -> new NotFoundException("Report không tồn tại"));
        Video video = videoRepository
            .findById(videoId)
            .orElseThrow(() -> new NotFoundException("Video không tồn tại"));

        ModerationDecision fromDecision = report.getDecision();
        report.setDecision(decision);
        report.setStatus("APPLIED");
        reportRepository.save(report);

        String actor = "ADMIN:" + (adminUserId == null ? adminLabel : adminUserId);
        decisionApplier.applyHuman(video, report, decision, actor);
        Long authorId = video.getAuthor() == null ? null : video.getAuthor().getId();
        trustService.onHumanResolve(authorId, videoId, fromDecision, decision);

        jdbcTemplate.update(
            """
            INSERT INTO moderator_actions
                (queue_id, video_id, report_id, actor_user_id, action_type, from_decision, to_decision,
                 reason_code, reason_text, created_at)
            VALUES (?, ?, ?, ?, 'RESOLVE', ?, ?, ?, ?, NOW())
            """,
            queueId,
            videoId,
            reportId,
            adminUserId,
            fromDecision.name(),
            decision.name(),
            blankTo(request.getReasonCode(), "HUMAN_OVERRIDE"),
            request.getReasonText()
        );

        jdbcTemplate.update(
            """
            UPDATE moderation_review_queue
            SET queue_state = 'RESOLVED', updated_at = NOW()
            WHERE id = ?
            """,
            queueId
        );

        jdbcTemplate.update(
            """
            INSERT INTO moderation_audit_logs
                (video_id, report_id, actor, action, before_json, after_json, created_at)
            VALUES (?, ?, ?, 'HUMAN_RESOLVE', CAST(? AS jsonb), CAST(? AS jsonb), NOW())
            """,
            videoId,
            reportId,
            actor,
            toJson(Map.of("decision", fromDecision.name())),
            toJson(Map.of(
                "decision", decision.name(),
                "reasonCode", blankTo(request.getReasonCode(), "HUMAN_OVERRIDE"),
                "reasonText", blankTo(request.getReasonText(), "")
            ))
        );

        ModerationEventOutboxEntity event = new ModerationEventOutboxEntity();
        event.setAggregateType("moderation_report");
        event.setAggregateId(String.valueOf(reportId));
        event.setEventType("moderation.human.overridden");
        event.setPayload(toJson(Map.of(
            "eventType", "moderation.human.overridden",
            "videoId", videoId,
            "reportId", reportId,
            "fromDecision", fromDecision.name(),
            "toDecision", decision.name(),
            "actor", actor
        )));
        outboxRepository.save(event);

        return getDetailByVideoId(videoId);
    }

    @Transactional(readOnly = true)
    public AdminModerationDetailResponse getDetailByPublicId(String publicIdRaw) {
        UUID publicId = VideoPublicIds.parse(publicIdRaw);
        Video video = videoRepository
            .findByPublicId(publicId)
            .orElseThrow(() -> new NotFoundException("Video không tồn tại"));
        return getDetailByVideoId(video.getId());
    }

    @Transactional
    public Map<String, Object> forceReevaluateByPublicId(String publicIdRaw) {
        UUID publicId = VideoPublicIds.parse(publicIdRaw);
        Video video = videoRepository
            .findByPublicId(publicId)
            .orElseThrow(() -> new NotFoundException("Video không tồn tại"));
        try {
            Long jobId = joinService.forceReevaluate(video.getId());
            if (jobId == null) {
                throw new BadRequestException(
                    "Không thể enqueue moderation (thiếu CU completed / draft / moderation tắt)."
                );
            }
            return Map.of(
                "videoId", video.getId(),
                "publicId", publicIdRaw,
                "moderationJobId", jobId,
                "status", "PENDING"
            );
        } catch (IllegalStateException ex) {
            throw new BadRequestException(ex.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public AdminModerationDetailResponse getDetailByVideoId(long videoId) {
        Video video = videoRepository
            .findById(videoId)
            .orElseThrow(() -> new NotFoundException("Video không tồn tại"));

        List<Map<String, Object>> reportRows = jdbcTemplate.queryForList(
            """
            SELECT id, risk, confidence, decision, status, override_applied, originality_pending,
                   explain_json, engine_version, policy_version, created_at
            FROM moderation_reports
            WHERE video_id = ?
            ORDER BY created_at DESC
            LIMIT 1
            """,
            videoId
        );
        Map<String, Object> report = reportRows.isEmpty() ? Map.of() : mapReport(reportRows.get(0));
        Long reportId = reportRows.isEmpty() ? null : ((Number) reportRows.get(0).get("id")).longValue();

        List<Map<String, Object>> evidence = reportId == null
            ? List.of()
            : jdbcTemplate.queryForList(
                """
                SELECT source_modality AS "sourceModality", reason_code AS "reasonCode", snippet,
                       frame_index AS "frameIndex", time_ms AS "timeMs", weight, ref_json AS "refJson"
                FROM moderation_evidence WHERE report_id = ? ORDER BY id ASC
                """,
                reportId
            );

        List<Map<String, Object>> policyResults = reportId == null
            ? List.of()
            : jdbcTemplate.queryForList(
                """
                SELECT label, outcome, score, rule_codes AS "ruleCodes", detail_json AS "detailJson"
                FROM moderation_policy_results WHERE report_id = ? ORDER BY id ASC
                """,
                reportId
            );

        List<Map<String, Object>> decisionRows = jdbcTemplate.queryForList(
            """
            SELECT effective_decision AS "effectiveDecision", explore_eligible AS "exploreEligible",
                   review_required AS "reviewRequired", status_applied AS "statusApplied",
                   applied_by AS "appliedBy", shadow, applied_at AS "appliedAt"
            FROM moderation_decisions WHERE video_id = ?
            """,
            videoId
        );
        Map<String, Object> decision = decisionRows.isEmpty() ? Map.of() : decisionRows.get(0);

        List<Map<String, Object>> queueRows = jdbcTemplate.queryForList(
            """
            SELECT id, queue_state, claimed_by
            FROM moderation_review_queue
            WHERE video_id = ? AND queue_state IN ('OPEN', 'CLAIMED')
            ORDER BY created_at DESC LIMIT 1
            """,
            videoId
        );
        Long queueId = queueRows.isEmpty() ? null : ((Number) queueRows.get(0).get("id")).longValue();
        String queueState = queueRows.isEmpty() ? null : String.valueOf(queueRows.get(0).get("queue_state"));
        String claimedBy = queueRows.isEmpty() ? null : (String) queueRows.get(0).get("claimed_by");

        List<Map<String, Object>> originalityRows = jdbcTemplate.queryForList(
            """
            SELECT decision, risk_level AS "riskLevel", overall_confidence AS "overallConfidence",
                   originality_score AS "originalityScore"
            FROM originality_reports WHERE video_id = ? LIMIT 1
            """,
            videoId
        );
        Map<String, Object> originality = originalityRows.isEmpty() ? Map.of() : originalityRows.get(0);

        List<Map<String, Object>> tags = jdbcTemplate.queryForList(
            """
            SELECT st.slug, vst.confidence, vst.source
            FROM video_semantic_tags vst
            JOIN semantic_tags st ON st.id = vst.tag_id
            WHERE vst.video_id = ?
            ORDER BY vst.confidence DESC
            LIMIT 40
            """,
            videoId
        );

        return new AdminModerationDetailResponse(
            video.getId(),
            video.getPublicId() == null ? null : video.getPublicId().toString(),
            video.getTitle(),
            video.getDescription(),
            video.getVideoUrl(),
            video.getThumbnailUrl(),
            video.getStatus() == null ? null : video.getStatus().name(),
            video.getAuthor() == null ? null : video.getAuthor().getUsername(),
            video.getAuthor() == null ? null : video.getAuthor().getId(),
            queueId,
            queueState,
            claimedBy,
            report,
            sanitizeJsonCols(evidence),
            sanitizeJsonCols(policyResults),
            decision,
            originality,
            tags
        );
    }

    private Map<String, Object> loadQueueRow(long queueId) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
            """
            SELECT q.id AS queue_id, q.video_id, q.report_id, q.priority, q.queue_state, q.reason,
                   q.claimed_by, q.created_at,
                   v.public_id, v.title, v.thumbnail_url,
                   u.username AS author_username,
                   r.decision AS ai_decision, r.risk, r.confidence, r.status AS report_status
            FROM moderation_review_queue q
            JOIN videos v ON v.id = q.video_id
            JOIN users u ON u.id = v.author_id
            JOIN moderation_reports r ON r.id = q.report_id
            WHERE q.id = ?
            """,
            queueId
        );
        if (rows.isEmpty()) {
            throw new NotFoundException("Hàng đợi moderation không tồn tại");
        }
        return rows.get(0);
    }

    private AdminModerationQueueItemResponse toQueueItem(Map<String, Object> row) {
        Object publicId = row.get("public_id");
        String reportStatus = String.valueOf(row.get("report_status"));
        return new AdminModerationQueueItemResponse(
            ((Number) row.get("queue_id")).longValue(),
            ((Number) row.get("video_id")).longValue(),
            publicId == null ? null : String.valueOf(publicId),
            (String) row.get("title"),
            (String) row.get("thumbnail_url"),
            (String) row.get("author_username"),
            ((Number) row.get("report_id")).longValue(),
            String.valueOf(row.get("ai_decision")),
            ((Number) row.get("risk")).intValue(),
            ((Number) row.get("confidence")).doubleValue(),
            String.valueOf(row.get("queue_state")),
            ((Number) row.get("priority")).intValue(),
            String.valueOf(row.get("reason")),
            (String) row.get("claimed_by"),
            row.get("created_at") == null ? null : String.valueOf(row.get("created_at")),
            "SHADOW".equalsIgnoreCase(reportStatus)
        );
    }

    private Map<String, Object> mapReport(Map<String, Object> row) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", row.get("id"));
        out.put("risk", row.get("risk"));
        out.put("confidence", row.get("confidence"));
        out.put("decision", row.get("decision"));
        out.put("status", row.get("status"));
        out.put("overrideApplied", row.get("override_applied"));
        out.put("originalityPending", row.get("originality_pending"));
        out.put("engineVersion", row.get("engine_version"));
        out.put("policyVersion", row.get("policy_version"));
        out.put("createdAt", row.get("created_at") == null ? null : String.valueOf(row.get("created_at")));
        out.put("explainJson", parseJson(row.get("explain_json")));
        return out;
    }

    private List<Map<String, Object>> sanitizeJsonCols(List<Map<String, Object>> rows) {
        List<Map<String, Object>> out = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            Map<String, Object> copy = new LinkedHashMap<>(row);
            if (copy.containsKey("refJson")) {
                copy.put("refJson", parseJson(copy.get("refJson")));
            }
            if (copy.containsKey("ruleCodes")) {
                copy.put("ruleCodes", parseJson(copy.get("ruleCodes")));
            }
            if (copy.containsKey("detailJson")) {
                copy.put("detailJson", parseJson(copy.get("detailJson")));
            }
            out.add(copy);
        }
        return out;
    }

    private Object parseJson(Object raw) {
        if (raw == null) {
            return Map.of();
        }
        if (raw instanceof Map<?, ?> || raw instanceof List<?>) {
            return raw;
        }
        try {
            return objectMapper.readValue(String.valueOf(raw), new TypeReference<>() {});
        } catch (Exception e) {
            return Map.of();
        }
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value == null ? Map.of() : value);
        } catch (Exception e) {
            return "{}";
        }
    }

    private static String blankTo(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private static long asLong(Object value, long fallback) {
        if (value instanceof Number n) {
            return n.longValue();
        }
        return fallback;
    }

    private static int asInt(Object value, int fallback) {
        if (value instanceof Number n) {
            return n.intValue();
        }
        return fallback;
    }

    private static double asDouble(Object value, double fallback) {
        if (value instanceof Number n) {
            return n.doubleValue();
        }
        return fallback;
    }
}
