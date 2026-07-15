package com.vibely.backend.moderation;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vibely.backend.common.BadRequestException;
import com.vibely.backend.common.NotFoundException;
import com.vibely.backend.common.UnauthorizedException;
import com.vibely.backend.user.entity.User;
import com.vibely.backend.user.repository.UserRepository;
import com.vibely.backend.video.Video;
import com.vibely.backend.video.VideoPublicIds;
import com.vibely.backend.video.VideoRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ModerationAppealService {

    private final JdbcTemplate jdbcTemplate;
    private final VideoRepository videoRepository;
    private final UserRepository userRepository;
    private final ModerationReportRepository reportRepository;
    private final ModerationDecisionRepository decisionRepository;
    private final ModerationDecisionApplier decisionApplier;
    private final CreatorTrustService trustService;
    private final ObjectMapper objectMapper;

    public ModerationAppealService(
        JdbcTemplate jdbcTemplate,
        VideoRepository videoRepository,
        UserRepository userRepository,
        ModerationReportRepository reportRepository,
        ModerationDecisionRepository decisionRepository,
        ModerationDecisionApplier decisionApplier,
        CreatorTrustService trustService,
        ObjectMapper objectMapper
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.videoRepository = videoRepository;
        this.userRepository = userRepository;
        this.reportRepository = reportRepository;
        this.decisionRepository = decisionRepository;
        this.decisionApplier = decisionApplier;
        this.trustService = trustService;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public ModerationStatusResponse statusForAuthor(String publicIdRaw, String email) {
        Video video = requireAuthorVideo(publicIdRaw, email);
        return buildStatus(video);
    }

    @Transactional
    public ModerationAppealResponse createAppeal(
        String publicIdRaw,
        String email,
        ModerationAppealCreateRequest request
    ) {
        Video video = requireAuthorVideo(publicIdRaw, email);
        User author = video.getAuthor();
        ModerationDecisionEntity decision = decisionRepository
            .findByVideo_Id(video.getId())
            .orElseThrow(() -> new BadRequestException("Chưa có quyết định kiểm duyệt để khiếu nại."));

        ModerationDecision effective = decision.getEffectiveDecision();
        if (effective == ModerationDecision.ALLOW && decision.isExploreEligible()) {
            throw new BadRequestException("Video đang được phân phối bình thường — không cần khiếu nại.");
        }

        List<Map<String, Object>> open = jdbcTemplate.queryForList(
            """
            SELECT id FROM moderation_appeals
            WHERE video_id = ? AND appeal_state IN ('PENDING', 'IN_REVIEW')
            LIMIT 1
            """,
            video.getId()
        );
        if (!open.isEmpty()) {
            throw new BadRequestException("Bạn đã có khiếu nại đang chờ xử lý cho video này.");
        }

        Long reportId = decision.getReport() == null ? null : decision.getReport().getId();
        if (reportId == null) {
            List<Map<String, Object>> latest = jdbcTemplate.queryForList(
                "SELECT id FROM moderation_reports WHERE video_id = ? ORDER BY created_at DESC LIMIT 1",
                video.getId()
            );
            if (!latest.isEmpty()) {
                reportId = ((Number) latest.get(0).get("id")).longValue();
            }
        }
        if (reportId == null) {
            throw new BadRequestException("Không tìm thấy báo cáo kiểm duyệt để khiếu nại.");
        }

        Long appealId;
        try {
            appealId = jdbcTemplate.queryForObject(
                """
                INSERT INTO moderation_appeals
                    (video_id, author_user_id, report_id, decision_id, from_decision, appeal_text,
                     appeal_state, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, 'PENDING', NOW(), NOW())
                RETURNING id
                """,
                Long.class,
                video.getId(),
                author.getId(),
                reportId,
                decision.getId(),
                effective.name(),
                request.getAppealText().trim()
            );
        } catch (DataIntegrityViolationException ex) {
            throw new BadRequestException("Bạn đã có khiếu nại đang chờ xử lý cho video này.");
        }

        Number queueIdNum = jdbcTemplate.queryForObject(
            """
            INSERT INTO moderation_review_queue
                (video_id, report_id, priority, queue_state, reason, created_at, updated_at)
            VALUES (?, ?, 200, 'OPEN', 'APPEAL', NOW(), NOW())
            RETURNING id
            """,
            Number.class,
            video.getId(),
            reportId
        );
        Long queueId = queueIdNum == null ? null : queueIdNum.longValue();
        jdbcTemplate.update(
            "UPDATE moderation_appeals SET queue_id = ?, updated_at = NOW() WHERE id = ?",
            queueId,
            appealId
        );

        jdbcTemplate.update(
            """
            INSERT INTO moderation_audit_logs
                (video_id, report_id, actor, action, before_json, after_json, created_at)
            VALUES (?, ?, ?, 'APPEAL_CREATED', '{}'::jsonb, CAST(? AS jsonb), NOW())
            """,
            video.getId(),
            reportId,
            "AUTHOR:" + author.getId(),
            toJson(Map.of(
                "appealId", appealId,
                "fromDecision", effective.name(),
                "queueId", queueId
            ))
        );

        return getAppeal(appealId);
    }

    @Transactional(readOnly = true)
    public AdminModerationAppealPageResponse listAppeals(int page, int size, String state) {
        int safePage = Math.max(0, page);
        int safeSize = Math.min(100, Math.max(1, size));
        int offset = safePage * safeSize;
        String stateFilter = state == null || state.isBlank()
            ? null
            : state.trim().toUpperCase(Locale.ROOT);

        String where = stateFilter == null
            ? "WHERE a.appeal_state IN ('PENDING', 'IN_REVIEW')"
            : "WHERE a.appeal_state = ?";

        Long total = stateFilter == null
            ? jdbcTemplate.queryForObject("SELECT COUNT(*) FROM moderation_appeals a " + where, Long.class)
            : jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM moderation_appeals a " + where,
                Long.class,
                stateFilter
            );
        if (total == null) {
            total = 0L;
        }

        String sql = """
            SELECT a.id AS appeal_id, a.video_id, a.from_decision, a.appeal_text, a.appeal_state,
                   a.created_at, a.queue_id,
                   v.public_id, v.title, u.username AS author_username
            FROM moderation_appeals a
            JOIN videos v ON v.id = a.video_id
            JOIN users u ON u.id = a.author_user_id
            %s
            ORDER BY a.created_at ASC
            LIMIT ? OFFSET ?
            """.formatted(where);

        List<Map<String, Object>> rows = stateFilter == null
            ? jdbcTemplate.queryForList(sql, safeSize, offset)
            : jdbcTemplate.queryForList(sql, stateFilter, safeSize, offset);

        List<AdminModerationAppealItemResponse> items = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            Object publicId = row.get("public_id");
            items.add(
                new AdminModerationAppealItemResponse(
                    ((Number) row.get("appeal_id")).longValue(),
                    ((Number) row.get("video_id")).longValue(),
                    publicId == null ? null : String.valueOf(publicId),
                    (String) row.get("title"),
                    (String) row.get("author_username"),
                    String.valueOf(row.get("from_decision")),
                    (String) row.get("appeal_text"),
                    String.valueOf(row.get("appeal_state")),
                    row.get("created_at") == null ? null : String.valueOf(row.get("created_at")),
                    row.get("queue_id") == null ? null : ((Number) row.get("queue_id")).longValue()
                )
            );
        }
        boolean hasNext = (long) (safePage + 1) * safeSize < total;
        return new AdminModerationAppealPageResponse(items, total, safePage, safeSize, hasNext);
    }

    @Transactional
    public ModerationAppealResponse resolveAppeal(
        long appealId,
        AdminModerationAppealResolveRequest request,
        Long adminUserId
    ) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
            """
            SELECT id, video_id, author_user_id, report_id, from_decision, appeal_state, queue_id
            FROM moderation_appeals WHERE id = ?
            """,
            appealId
        );
        if (rows.isEmpty()) {
            throw new NotFoundException("Khiếu nại không tồn tại");
        }
        Map<String, Object> row = rows.get(0);
        String state = String.valueOf(row.get("appeal_state"));
        if (!"PENDING".equals(state) && !"IN_REVIEW".equals(state)) {
            throw new BadRequestException("Khiếu nại đã được xử lý.");
        }

        String outcome = request.normalizedOutcome();
        if (!List.of("UPHELD", "SOFTENED", "RESTORED", "REJECTED").contains(outcome)) {
            throw new BadRequestException("outcome không hợp lệ");
        }
        ModerationDecision toDecision = request.parsedDecision();
        if (("UPHELD".equals(outcome) || "REJECTED".equals(outcome))
            && toDecision == ModerationDecision.ALLOW) {
            // still allowed if admin chooses but warn via audit — OK
        }
        if ("RESTORED".equals(outcome) && toDecision != ModerationDecision.ALLOW) {
            throw new BadRequestException("RESTORED phải đi kèm quyết định ALLOW.");
        }

        long videoId = ((Number) row.get("video_id")).longValue();
        long authorId = ((Number) row.get("author_user_id")).longValue();
        Long reportId = row.get("report_id") == null ? null : ((Number) row.get("report_id")).longValue();
        Long queueId = row.get("queue_id") == null ? null : ((Number) row.get("queue_id")).longValue();

        Video video = videoRepository.findById(videoId)
            .orElseThrow(() -> new NotFoundException("Video không tồn tại"));
        ModerationReportEntity report = null;
        if (reportId != null) {
            report = reportRepository.findById(reportId).orElse(null);
        }
        if (report == null) {
            List<Map<String, Object>> latest = jdbcTemplate.queryForList(
                "SELECT id FROM moderation_reports WHERE video_id = ? ORDER BY created_at DESC LIMIT 1",
                videoId
            );
            if (!latest.isEmpty()) {
                report = reportRepository
                    .findById(((Number) latest.get(0).get("id")).longValue())
                    .orElse(null);
            }
        }
        if (report == null) {
            throw new BadRequestException("Không tìm thấy báo cáo kiểm duyệt để áp dụng.");
        }

        report.setDecision(toDecision);
        report.setStatus("APPLIED");
        reportRepository.save(report);

        String actor = "ADMIN:" + (adminUserId == null ? "unknown" : adminUserId);
        decisionApplier.applyHuman(video, report, toDecision, actor);

        jdbcTemplate.update(
            """
            UPDATE moderation_appeals
            SET appeal_state = ?, resolved_decision = ?, resolver_user_id = ?, resolver_notes = ?,
                resolved_at = NOW(), updated_at = NOW()
            WHERE id = ?
            """,
            outcome,
            toDecision.name(),
            adminUserId,
            request.getNotes(),
            appealId
        );

        if (queueId != null) {
            jdbcTemplate.update(
                """
                UPDATE moderation_review_queue
                SET queue_state = 'RESOLVED', updated_at = NOW()
                WHERE id = ? AND queue_state IN ('OPEN', 'CLAIMED')
                """,
                queueId
            );
        }

        jdbcTemplate.update(
            """
            INSERT INTO moderation_audit_logs
                (video_id, report_id, actor, action, before_json, after_json, created_at)
            VALUES (?, ?, ?, 'APPEAL_RESOLVED', CAST(? AS jsonb), CAST(? AS jsonb), NOW())
            """,
            videoId,
            report.getId(),
            actor,
            toJson(Map.of("fromDecision", String.valueOf(row.get("from_decision")), "state", state)),
            toJson(Map.of(
                "outcome", outcome,
                "decision", toDecision.name(),
                "notes", request.getNotes() == null ? "" : request.getNotes()
            ))
        );

        trustService.onAppealResolved(authorId, videoId, outcome, toDecision);
        return getAppeal(appealId);
    }

    private ModerationAppealResponse getAppeal(long appealId) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
            """
            SELECT a.id, a.from_decision, a.appeal_text, a.appeal_state, a.resolved_decision,
                   a.resolver_notes, a.created_at, a.resolved_at, v.public_id
            FROM moderation_appeals a
            JOIN videos v ON v.id = a.video_id
            WHERE a.id = ?
            """,
            appealId
        );
        if (rows.isEmpty()) {
            throw new NotFoundException("Khiếu nại không tồn tại");
        }
        Map<String, Object> row = rows.get(0);
        Object publicId = row.get("public_id");
        return new ModerationAppealResponse(
            ((Number) row.get("id")).longValue(),
            publicId == null ? null : String.valueOf(publicId),
            String.valueOf(row.get("from_decision")),
            (String) row.get("appeal_text"),
            String.valueOf(row.get("appeal_state")),
            row.get("resolved_decision") == null ? null : String.valueOf(row.get("resolved_decision")),
            (String) row.get("resolver_notes"),
            row.get("created_at") == null ? null : String.valueOf(row.get("created_at")),
            row.get("resolved_at") == null ? null : String.valueOf(row.get("resolved_at"))
        );
    }

    private ModerationStatusResponse buildStatus(Video video) {
        var decisionOpt = decisionRepository.findByVideo_Id(video.getId());
        String publicId = video.getPublicId() == null ? null : video.getPublicId().toString();
        double trust = trustService.getTrustScore(
            video.getAuthor() == null ? null : video.getAuthor().getId()
        );

        List<Map<String, Object>> appealRows = jdbcTemplate.queryForList(
            """
            SELECT appeal_state FROM moderation_appeals
            WHERE video_id = ?
            ORDER BY created_at DESC LIMIT 1
            """,
            video.getId()
        );
        String appealState = appealRows.isEmpty()
            ? null
            : String.valueOf(appealRows.get(0).get("appeal_state"));
        boolean hasOpen = "PENDING".equals(appealState) || "IN_REVIEW".equals(appealState);

        if (decisionOpt.isEmpty()) {
            return new ModerationStatusResponse(
                publicId,
                "NONE",
                null,
                true,
                false,
                false,
                hasOpen,
                appealState,
                trust,
                "Chưa có quyết định kiểm duyệt tự động."
            );
        }

        ModerationDecisionEntity d = decisionOpt.get();
        ModerationDecision eff = d.getEffectiveDecision();
        boolean appealable = !hasOpen
            && !(eff == ModerationDecision.ALLOW && d.isExploreEligible());
        String label = switch (eff) {
            case ALLOW -> d.isExploreEligible() ? "NORMAL" : "LIMITED";
            case LIMIT -> "LIMITED";
            case REVIEW -> "UNDER_REVIEW";
            case BLOCK, DELETE -> "REMOVED";
        };
        String message = switch (label) {
            case "NORMAL" -> "Video đang được phân phối bình thường.";
            case "LIMITED" -> "Video bị hạn chế phân phối (không vào Khám phá / Dành cho bạn).";
            case "UNDER_REVIEW" -> "Video đang được kiểm duyệt viên xem lại.";
            case "REMOVED" -> "Video đã bị gỡ khỏi nền tảng.";
            default -> "Trạng thái kiểm duyệt.";
        };
        return new ModerationStatusResponse(
            publicId,
            label,
            eff.name(),
            d.isExploreEligible(),
            d.isReviewRequired(),
            appealable,
            hasOpen,
            appealState,
            trust,
            message
        );
    }

    private Video requireAuthorVideo(String publicIdRaw, String email) {
        if (email == null || email.isBlank()) {
            throw new UnauthorizedException("Cần đăng nhập.");
        }
        UUID publicId = VideoPublicIds.parse(publicIdRaw);
        Video video = videoRepository
            .findByPublicId(publicId)
            .orElseThrow(() -> new NotFoundException("Video không tồn tại"));
        User author = userRepository
            .findByEmail(email)
            .orElseThrow(() -> new UnauthorizedException("Không xác thực được người dùng."));
        if (video.getAuthor() == null || !author.getId().equals(video.getAuthor().getId())) {
            throw new UnauthorizedException("Chỉ tác giả mới xem/khiếu nại được.");
        }
        return video;
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value == null ? Map.of() : value);
        } catch (Exception e) {
            return "{}";
        }
    }
}
