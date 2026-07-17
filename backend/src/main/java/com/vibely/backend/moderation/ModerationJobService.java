package com.vibely.backend.moderation;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vibely.backend.admin.AdminAccountBanEmailService;
import com.vibely.backend.admin.AdminBannedUserInfo;
import com.vibely.backend.common.BadRequestException;
import com.vibely.backend.common.NotFoundException;
import com.vibely.backend.video.Video;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ModerationJobService {

    private final ModerationJobRepository jobRepository;
    private final ModerationReportRepository reportRepository;
    private final ModerationProperties properties;
    private final ModerationDecisionApplier decisionApplier;
    private final ModerationEventOutboxRepository outboxRepository;
    private final CreatorTrustService trustService;
    private final ModerationAutoBanService autoBanService;
    private final AdminAccountBanEmailService accountBanEmailService;
    private final ModerationSnapshotBuilder snapshotBuilder;
    private final ObjectMapper objectMapper;
    private final JdbcTemplate jdbcTemplate;

    public ModerationJobService(
        ModerationJobRepository jobRepository,
        ModerationReportRepository reportRepository,
        ModerationProperties properties,
        ModerationDecisionApplier decisionApplier,
        ModerationEventOutboxRepository outboxRepository,
        CreatorTrustService trustService,
        ModerationAutoBanService autoBanService,
        AdminAccountBanEmailService accountBanEmailService,
        ModerationSnapshotBuilder snapshotBuilder,
        ObjectMapper objectMapper,
        JdbcTemplate jdbcTemplate
    ) {
        this.jobRepository = jobRepository;
        this.reportRepository = reportRepository;
        this.properties = properties;
        this.decisionApplier = decisionApplier;
        this.outboxRepository = outboxRepository;
        this.trustService = trustService;
        this.autoBanService = autoBanService;
        this.accountBanEmailService = accountBanEmailService;
        this.snapshotBuilder = snapshotBuilder;
        this.objectMapper = objectMapper;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional
    public Optional<ModerationClaimResponse> claimNext() {
        Optional<Long> lockedId = jobRepository.lockNextPendingJobId();
        if (lockedId.isEmpty()) {
            return Optional.empty();
        }
        ModerationJobEntity job = jobRepository
            .findWithVideoAndAuthorById(lockedId.get())
            .orElseThrow(() -> new NotFoundException("Moderation job không tồn tại"));
        job.setJobState(ModerationJobState.PROCESSING);
        job.setClaimedAt(LocalDateTime.now());
        job.setAttempts(job.getAttempts() + 1);
        job.setLastError(null);
        jobRepository.save(job);

        Video video = job.getVideo();
        Map<String, Object> snapshot = snapshotBuilder.enrichForPlugins(
            video.getId(),
            parseJsonMap(job.getSnapshotJson())
        );
        Map<String, Object> policy = loadActivePolicy(job.getPolicyVersion());
        List<Map<String, Object>> rules = loadRules(job.getPolicyVersion());
        List<Map<String, Object>> detectors = loadDetectors();

        return Optional.of(
            new ModerationClaimResponse(
                job.getId(),
                video.getId(),
                video.getPublicId() == null ? null : video.getPublicId().toString(),
                job.getPolicyVersion(),
                job.isOriginalityPending(),
                job.getAttempts(),
                snapshot,
                policy,
                rules,
                detectors
            )
        );
    }

    @Transactional
    public void complete(long jobId, ModerationCompleteRequest request) {
        ModerationJobEntity job = jobRepository
            .findWithVideoAndAuthorById(jobId)
            .orElseThrow(() -> new NotFoundException("Moderation job không tồn tại"));
        if (job.getJobState() != ModerationJobState.PROCESSING
            && job.getJobState() != ModerationJobState.PENDING) {
            throw new BadRequestException("Job moderation không ở trạng thái có thể complete.");
        }
        if (reportRepository.findByJob_Id(jobId).isPresent()) {
            throw new BadRequestException("Job moderation đã complete.");
        }

        ModerationDecision decision = parseDecision(request.getDecision());
        boolean shadow = !properties.isApplyDecisions();

        ModerationReportEntity report = new ModerationReportEntity();
        report.setJob(job);
        report.setVideo(job.getVideo());
        report.setPolicyVersion(job.getPolicyVersion());
        report.setRisk(request.getRisk());
        report.setConfidence(request.getConfidence());
        report.setDecision(decision);
        report.setStatus(shadow ? "SHADOW" : "OPEN");
        report.setOverrideApplied(request.isOverrideApplied());
        report.setOriginalityPending(request.isOriginalityPending() || job.isOriginalityPending());
        report.setExplainJson(toJson(request.getExplainJson()));
        report.setEngineVersion(
            blankTo(request.getEngineVersion(), properties.getEngineVersion())
        );
        ModerationReportEntity saved = reportRepository.save(report);

        for (ModerationCompleteRequest.EvidenceItem item : request.getEvidence()) {
            if (item == null || item.getReasonCode() == null || item.getReasonCode().isBlank()) {
                continue;
            }
            String modality = blankTo(item.getSourceModality(), "RULE").trim().toUpperCase(Locale.ROOT);
            jdbcTemplate.update(
                """
                INSERT INTO moderation_evidence
                    (report_id, source_modality, reason_code, snippet, frame_index, time_ms, weight, ref_json, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, CAST(? AS jsonb), NOW())
                """,
                saved.getId(),
                modality,
                item.getReasonCode(),
                item.getSnippet(),
                item.getFrameIndex(),
                item.getTimeMs(),
                item.getWeight() == null ? 1.0 : item.getWeight(),
                toJson(item.getRefJson())
            );
        }

        for (ModerationCompleteRequest.PolicyResultItem item : request.getPolicyResults()) {
            if (item == null || item.getLabel() == null || item.getLabel().isBlank()) {
                continue;
            }
            jdbcTemplate.update(
                """
                INSERT INTO moderation_policy_results
                    (report_id, label, outcome, score, rule_codes, detail_json)
                VALUES (?, ?, ?, ?, CAST(? AS jsonb), CAST(? AS jsonb))
                """,
                saved.getId(),
                item.getLabel(),
                blankTo(item.getOutcome(), "NONE"),
                item.getScore() == null ? 0.0 : item.getScore(),
                toJson(item.getRuleCodes()),
                toJson(item.getDetailJson())
            );
        }

        decisionApplier.apply(job.getVideo(), saved, decision, shadow);
        Long authorId = job.getVideo().getAuthor() == null ? null : job.getVideo().getAuthor().getId();
        boolean autoBanned = false;
        if (!shadow && autoBanService.shouldAutoBan(decision, request)) {
            AdminBannedUserInfo bannedUser = autoBanService.banAuthorForModeration(
                authorId,
                job.getVideo().getId(),
                decision,
                "Vi phạm chính sách nội dung (bạo lực / tình dục / spam). Video #"
                    + job.getVideo().getId()
            );
            if (bannedUser != null) {
                autoBanned = true;
                jdbcTemplate.update(
                    """
                    INSERT INTO moderation_audit_logs
                        (video_id, report_id, actor, action, before_json, after_json, created_at)
                    VALUES (?, ?, 'SYSTEM', 'AI_AUTO_BAN', '{}'::jsonb, CAST(? AS jsonb), NOW())
                    """,
                    job.getVideo().getId(),
                    saved.getId(),
                    toJson(Map.of(
                        "authorId", authorId,
                        "decision", decision.name(),
                        "risk", request.getRisk()
                    ))
                );
                writeOutbox(
                    "user",
                    String.valueOf(authorId),
                    "moderation.author.auto_banned",
                    Map.of(
                        "eventType", "moderation.author.auto_banned",
                        "userId", authorId,
                        "videoId", job.getVideo().getId(),
                        "decision", decision.name(),
                        "reportId", saved.getId()
                    )
                );
                accountBanEmailService.sendAccountBanned(bannedUser);
            }
        }
        trustService.recordPolicyEvent(
            authorId,
            job.getVideo().getId(),
            decision.name(),
            shadow ? "AI_SHADOW" : "AI"
        );
        if (!shadow && decision == ModerationDecision.ALLOW) {
            trustService.onAiAllow(authorId, job.getVideo().getId());
        }

        if (!autoBanned && (decision == ModerationDecision.REVIEW
            || decision == ModerationDecision.BLOCK
            || decision == ModerationDecision.DELETE)) {
            String reason = decision == ModerationDecision.REVIEW ? "AI_REVIEW" : "AI_BLOCK_HOLD";
            jdbcTemplate.update(
                """
                INSERT INTO moderation_review_queue
                    (video_id, report_id, priority, queue_state, reason, created_at, updated_at)
                VALUES (?, ?, ?, 'OPEN', ?, NOW(), NOW())
                """,
                job.getVideo().getId(),
                saved.getId(),
                Math.max(1, 100 - request.getRisk()),
                reason
            );
            writeOutbox(
                "moderation_report",
                String.valueOf(saved.getId()),
                "moderation.review.required",
                Map.of(
                    "eventType", "moderation.review.required",
                    "videoId", job.getVideo().getId(),
                    "reportId", saved.getId(),
                    "decision", decision.name()
                )
            );
        }

        job.setJobState(ModerationJobState.COMPLETED);
        job.setLastError(null);
        jobRepository.save(job);

        writeOutbox(
            "moderation_job",
            String.valueOf(jobId),
            "moderation.completed",
            Map.of(
                "eventType", "moderation.completed",
                "jobId", jobId,
                "videoId", job.getVideo().getId(),
                "decision", decision.name(),
                "risk", request.getRisk(),
                "shadow", shadow
            )
        );

        jdbcTemplate.update(
            """
            INSERT INTO moderation_audit_logs
                (video_id, report_id, actor, action, before_json, after_json, created_at)
            VALUES (?, ?, 'SYSTEM', 'AI_COMPLETE', '{}'::jsonb, CAST(? AS jsonb), NOW())
            """,
            job.getVideo().getId(),
            saved.getId(),
            toJson(Map.of(
                "decision", decision.name(),
                "risk", request.getRisk(),
                "confidence", request.getConfidence(),
                "shadow", shadow,
                "autoBanned", autoBanned
            ))
        );
    }

    @Transactional
    public void fail(long jobId, String errorMessage) {
        ModerationJobEntity job = jobRepository
            .findById(jobId)
            .orElseThrow(() -> new NotFoundException("Moderation job không tồn tại"));
        String truncated = truncate(errorMessage, 2000);
        job.setLastError(truncated);
        int maxAttempts = Math.max(1, properties.getMaxJobAttempts());
        if (job.getAttempts() >= maxAttempts) {
            job.setJobState(ModerationJobState.FAILED);
        } else {
            job.setJobState(ModerationJobState.PENDING);
            job.setClaimedAt(null);
        }
        jobRepository.save(job);
    }

    @Transactional
    public void recoverStaleProcessing() {
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(
            Math.max(1, properties.getStaleProcessingMinutes())
        );
        for (ModerationJobEntity job : jobRepository.findByJobStateAndClaimedAtBefore(
            ModerationJobState.PROCESSING,
            cutoff
        )) {
            if (job.getAttempts() >= properties.getMaxJobAttempts()) {
                job.setJobState(ModerationJobState.FAILED);
                job.setLastError("Stale PROCESSING timeout");
            } else {
                job.setJobState(ModerationJobState.PENDING);
                job.setClaimedAt(null);
                job.setLastError("Requeued after stale PROCESSING");
            }
            jobRepository.save(job);
        }
    }

    private Map<String, Object> loadActivePolicy(String policyVersion) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
            """
            SELECT code, thresholds_json, weights_json
            FROM policy_versions
            WHERE code = ? OR is_active = TRUE
            ORDER BY CASE WHEN code = ? THEN 0 ELSE 1 END
            LIMIT 1
            """,
            policyVersion,
            policyVersion
        );
        Map<String, Object> policy = new LinkedHashMap<>();
        policy.put("code", policyVersion);
        policy.put("thresholds", Map.of("allow_max", 24, "limit_max", 49, "review_max", 74, "confidence_floor", 0.45));
        policy.put("weights", Map.of("LOW", 5, "MEDIUM", 15, "HIGH", 30, "CRITICAL", 50));
        if (rows.isEmpty()) {
            return policy;
        }
        Map<String, Object> row = rows.get(0);
        policy.put("code", row.get("code"));
        policy.put("thresholds", parseJsonMap(String.valueOf(row.get("thresholds_json"))));
        policy.put("weights", parseJsonMap(String.valueOf(row.get("weights_json"))));
        return policy;
    }

    private List<Map<String, Object>> loadRules(String policyVersion) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
            """
            SELECT rv.rule_code, rv.label, rv.priority, rv.match_json, rv.severity,
                   rv.action_hint, rv.override_flag, rv.points, rv.description
            FROM moderation_rule_versions rv
            JOIN policy_versions pv ON pv.id = rv.policy_version_id
            WHERE pv.code = ?
            ORDER BY rv.priority ASC, rv.rule_code ASC
            """,
            policyVersion
        );
        if (rows.isEmpty()) {
            rows = jdbcTemplate.queryForList(
                """
                SELECT code AS rule_code, label, priority, match_json, severity,
                       action_hint, override_flag AS override_flag, points, description
                FROM moderation_rules
                WHERE enabled = TRUE
                ORDER BY priority ASC, code ASC
                """
            );
        }
        List<Map<String, Object>> rules = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            Map<String, Object> rule = new LinkedHashMap<>();
            rule.put("code", row.get("rule_code"));
            rule.put("label", row.get("label"));
            rule.put("priority", row.get("priority"));
            rule.put("match", parseJsonMap(String.valueOf(row.get("match_json"))));
            rule.put("severity", row.get("severity"));
            rule.put("action_hint", row.get("action_hint"));
            rule.put("override", Boolean.TRUE.equals(row.get("override_flag"))
                || Boolean.TRUE.equals(row.get("override")));
            rule.put("points", row.get("points"));
            rule.put("description", row.get("description"));
            rules.add(rule);
        }
        return rules;
    }

    private List<Map<String, Object>> loadDetectors() {
        List<Map<String, Object>> rows;
        try {
            rows = jdbcTemplate.queryForList(
                """
                SELECT code, display_name, artifact_kind, artifact_ref, config_json, enabled
                FROM detector_registry
                WHERE enabled = TRUE
                ORDER BY code ASC
                """
            );
        } catch (Exception e) {
            // Pre-V69 databases: claim still works without plugins.
            return List.of();
        }
        List<Map<String, Object>> detectors = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            Map<String, Object> d = new LinkedHashMap<>();
            d.put("code", row.get("code"));
            d.put("displayName", row.get("display_name"));
            d.put("artifactKind", row.get("artifact_kind"));
            d.put("artifactRef", row.get("artifact_ref"));
            d.put("config", parseJsonMap(String.valueOf(row.get("config_json"))));
            d.put("enabled", Boolean.TRUE.equals(row.get("enabled")));
            detectors.add(d);
        }
        return detectors;
    }

    private void writeOutbox(
        String aggregateType,
        String aggregateId,
        String eventType,
        Map<String, Object> payload
    ) {
        ModerationEventOutboxEntity event = new ModerationEventOutboxEntity();
        event.setAggregateType(aggregateType);
        event.setAggregateId(aggregateId);
        event.setEventType(eventType);
        event.setPayload(toJson(payload));
        outboxRepository.save(event);
    }

    private ModerationDecision parseDecision(String raw) {
        try {
            return ModerationDecision.valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (Exception e) {
            throw new BadRequestException("decision không hợp lệ: " + raw);
        }
    }

    private Map<String, Object> parseJsonMap(String raw) {
        if (raw == null || raw.isBlank()) {
            return new HashMap<>();
        }
        try {
            return objectMapper.readValue(raw, new TypeReference<>() {});
        } catch (Exception e) {
            return new HashMap<>();
        }
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value == null ? Map.of() : value);
        } catch (JsonProcessingException e) {
            return "{}";
        }
    }

    private static String blankTo(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private static String truncate(String value, int max) {
        if (value == null) {
            return null;
        }
        return value.length() <= max ? value : value.substring(0, max);
    }
}
