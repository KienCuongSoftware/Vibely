package com.vibely.backend.contentunderstanding;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vibely.backend.common.BadRequestException;
import com.vibely.backend.common.NotFoundException;
import com.vibely.backend.video.Video;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ContentUnderstandingJobService {

    private final AnalysisJobRepository jobRepository;
    private final SemanticTagRepository semanticTagRepository;
    private final SemanticTagAliasRepository aliasRepository;
    private final ContentUnderstandingProperties properties;
    private final ObjectMapper objectMapper;
    private final JdbcTemplate jdbcTemplate;
    private final SemanticTopicProjectionService topicProjectionService;

    public ContentUnderstandingJobService(
        AnalysisJobRepository jobRepository,
        SemanticTagRepository semanticTagRepository,
        SemanticTagAliasRepository aliasRepository,
        ContentUnderstandingProperties properties,
        ObjectMapper objectMapper,
        JdbcTemplate jdbcTemplate,
        SemanticTopicProjectionService topicProjectionService
    ) {
        this.jobRepository = jobRepository;
        this.semanticTagRepository = semanticTagRepository;
        this.aliasRepository = aliasRepository;
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.jdbcTemplate = jdbcTemplate;
        this.topicProjectionService = topicProjectionService;
    }

    @Transactional
    public Optional<CuClaimResponse> claimNext(String workerId) {
        Optional<UUID> lockedId = jobRepository.lockNextPendingJobId();
        if (lockedId.isEmpty()) {
            return Optional.empty();
        }
        return markRunning(lockedId.get(), workerId);
    }

    @Transactional
    public Optional<CuClaimResponse> claimById(UUID jobId, String workerId) {
        AnalysisJobEntity job = jobRepository
            .findWithVideoAndAuthorById(jobId)
            .orElseThrow(() -> new NotFoundException("Analysis job không tồn tại"));
        if (job.getStatus() != AnalysisJobStatus.PENDING
            && job.getStatus() != AnalysisJobStatus.FAILED_RETRYABLE) {
            return Optional.empty();
        }
        return markRunning(jobId, workerId);
    }

    private Optional<CuClaimResponse> markRunning(UUID jobId, String workerId) {
        AnalysisJobEntity job = jobRepository
            .findWithVideoAndAuthorById(jobId)
            .orElseThrow(() -> new NotFoundException("Analysis job không tồn tại"));
        Video video = job.getVideo();
        LocalDateTime now = LocalDateTime.now();
        job.setStatus(AnalysisJobStatus.RUNNING);
        job.setAttempts(job.getAttempts() + 1);
        job.setLockedBy(workerId == null || workerId.isBlank() ? "cu-worker" : workerId);
        job.setLockedAt(now);
        job.setStartedAt(now);
        job.setErrorCode(null);
        job.setErrorMessage(null);
        jobRepository.save(job);
        return Optional.of(
            new CuClaimResponse(
                job.getId().toString(),
                video.getId(),
                video.getPublicId() == null ? null : video.getPublicId().toString(),
                video.getVideoUrl(),
                video.getThumbnailUrl(),
                video.getTitle(),
                video.getDescription(),
                video.getAudioTitle(),
                job.getModelBundleVersion(),
                job.getAttempts(),
                job.getTriggerReason()
            )
        );
    }

    @Transactional
    public void complete(UUID jobId, CuCompleteRequest request) {
        AnalysisJobEntity job = jobRepository
            .findWithVideoAndAuthorById(jobId)
            .orElseThrow(() -> new NotFoundException("Analysis job không tồn tại"));
        if (job.getStatus() != AnalysisJobStatus.RUNNING && job.getStatus() != AnalysisJobStatus.PENDING) {
            throw new BadRequestException("Job không ở trạng thái có thể complete.");
        }
        Video video = job.getVideo();
        Long videoId = video.getId();

        // Prefer JDBC upsert: assigned @MapsId / composite IDs confuse Spring Data save→merge.
        jdbcTemplate.update("DELETE FROM video_semantic_tags WHERE video_id = ?", videoId);

        List<CuCompleteRequest.TagItem> tags =
            request.getSemanticTags() == null ? List.of() : request.getSemanticTags();
        Map<Long, Float> tagScores = new HashMap<>();
        List<SemanticTopicProjectionService.ScoredTag> topicTags = new ArrayList<>();
        for (CuCompleteRequest.TagItem item : tags) {
            if (item == null || item.getSlug() == null || item.getSlug().isBlank()) {
                continue;
            }
            SemanticTagEntity tag = resolveTag(item.getSlug());
            if (tag == null) {
                continue;
            }
            float conf = clamp01(item.getConfidence() == null ? 0.5f : item.getConfidence());
            String evidenceJson = toJson(item.getEvidence() == null ? Map.of() : item.getEvidence());
            jdbcTemplate.update(
                """
                    INSERT INTO video_semantic_tags
                        (video_id, tag_id, confidence, source, model_version, reason, evidence, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, CAST(? AS jsonb), NOW(), NOW())
                    ON CONFLICT (video_id, tag_id) DO UPDATE SET
                        confidence = EXCLUDED.confidence,
                        source = EXCLUDED.source,
                        model_version = EXCLUDED.model_version,
                        reason = EXCLUDED.reason,
                        evidence = EXCLUDED.evidence,
                        updated_at = NOW()
                    """,
                videoId,
                tag.getId(),
                conf,
                blankTo(item.getSource(), "fusion"),
                blankTo(item.getModelVersion(), job.getModelBundleVersion()),
                blankTo(item.getReason(), "phase1"),
                evidenceJson
            );
            tagScores.merge(tag.getId(), conf, Math::max);
            topicTags.add(new SemanticTopicProjectionService.ScoredTag(tag.getSlug(), conf));
        }

        String metadataJson = toJson(request.getMetadataFeatures() == null ? Map.of() : request.getMetadataFeatures());
        String ocrJson = toJson(request.getOcrFeatures() == null ? Map.of() : request.getOcrFeatures());
        String visualJson = toJson(request.getVisualFeatures() == null ? Map.of() : request.getVisualFeatures());
        String speechJson = toJson(request.getSpeechFeatures() == null ? Map.of() : request.getSpeechFeatures());
        String audioJson = toJson(request.getAudioFeatures() == null ? Map.of() : request.getAudioFeatures());
        String objectJson = toJson(request.getObjectFeatures() == null ? Map.of() : request.getObjectFeatures());
        String sceneJson = toJson(request.getSceneFeatures() == null ? Map.of() : request.getSceneFeatures());
        jdbcTemplate.update(
            """
                INSERT INTO content_features
                    (video_id, content_sha256, feature_version, metadata, ocr, visual, speech, audio,
                     object_features, scene, updated_at)
                VALUES (?, ?, ?, CAST(? AS jsonb), CAST(? AS jsonb), CAST(? AS jsonb), CAST(? AS jsonb),
                        CAST(? AS jsonb), CAST(? AS jsonb), CAST(? AS jsonb), NOW())
                ON CONFLICT (video_id) DO UPDATE SET
                    content_sha256 = EXCLUDED.content_sha256,
                    feature_version = EXCLUDED.feature_version,
                    metadata = EXCLUDED.metadata,
                    ocr = EXCLUDED.ocr,
                    visual = EXCLUDED.visual,
                    speech = EXCLUDED.speech,
                    audio = EXCLUDED.audio,
                    object_features = EXCLUDED.object_features,
                    scene = EXCLUDED.scene,
                    updated_at = NOW()
                """,
            videoId,
            request.getContentSha256(),
            blankTo(request.getFeatureVersion(), "cu-phase2.1"),
            metadataJson,
            ocrJson,
            visualJson,
            speechJson,
            audioJson,
            objectJson,
            sceneJson
        );

        projectCategories(videoId, tagScores);
        topicProjectionService.projectTopicsFromTags(video, topicTags);

        job.setStatus(AnalysisJobStatus.COMPLETED);
        job.setFinishedAt(LocalDateTime.now());
        job.setMetrics(toJson(request.getMetrics() == null ? Map.of() : request.getMetrics()));
        job.setErrorCode(null);
        job.setErrorMessage(null);
        jobRepository.save(job);
    }

    @Transactional
    public void fail(UUID jobId, String errorMessage) {
        AnalysisJobEntity job = jobRepository
            .findById(jobId)
            .orElseThrow(() -> new NotFoundException("Analysis job không tồn tại"));
        String msg = errorMessage == null ? "unknown" : errorMessage;
        job.setErrorMessage(msg.substring(0, Math.min(1900, msg.length())));
        if (job.getAttempts() >= properties.getMaxJobAttempts()) {
            job.setStatus(AnalysisJobStatus.FAILED_TERMINAL);
            job.setFinishedAt(LocalDateTime.now());
        } else {
            job.setStatus(AnalysisJobStatus.PENDING);
            job.setLockedAt(null);
            job.setLockedBy(null);
        }
        jobRepository.save(job);
    }

    @Transactional
    public void recoverStaleJobs() {
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(Math.max(1, properties.getStaleRunningMinutes()));
        for (AnalysisJobEntity job : jobRepository.findByStatusAndLockedAtBefore(AnalysisJobStatus.RUNNING, cutoff)) {
            if (job.getAttempts() >= properties.getMaxJobAttempts()) {
                job.setStatus(AnalysisJobStatus.FAILED_TERMINAL);
                job.setErrorMessage("Stale RUNNING timeout");
                job.setFinishedAt(LocalDateTime.now());
            } else {
                job.setStatus(AnalysisJobStatus.PENDING);
                job.setLockedAt(null);
                job.setLockedBy(null);
                job.setErrorMessage("Requeued after stale RUNNING");
            }
            jobRepository.save(job);
        }
    }

    private void projectCategories(Long videoId, Map<Long, Float> tagScores) {
        if (tagScores.isEmpty()) {
            return;
        }
        List<Map<String, Object>> mappings = jdbcTemplate.queryForList(
            "SELECT category_id, tag_id, weight, min_tag_confidence FROM category_tag_mapping"
        );
        Map<Long, Double> categoryScores = new HashMap<>();
        for (Map<String, Object> row : mappings) {
            Long tagId = ((Number) row.get("tag_id")).longValue();
            Float conf = tagScores.get(tagId);
            if (conf == null) {
                continue;
            }
            double minConf = ((Number) row.get("min_tag_confidence")).doubleValue();
            if (conf < minConf) {
                continue;
            }
            Long categoryId = ((Number) row.get("category_id")).longValue();
            double weight = ((Number) row.get("weight")).doubleValue();
            categoryScores.merge(categoryId, weight * conf, Double::sum);
        }
        for (Map.Entry<Long, Double> e : categoryScores.entrySet()) {
            double raw = e.getValue();
            if (raw < 0.5) {
                continue;
            }
            // Explore hybrid: video_categories needs score >= 1.0; discovery scores use >= 0.35
            double categoryTableScore = Math.max(1.0, Math.min(2.0, raw * 1.5));
            double discoveryScore = Math.min(1.0, raw);
            jdbcTemplate.update(
                """
                    INSERT INTO video_categories (video_id, category_id, score, created_at)
                    VALUES (?, ?, ?, NOW())
                    ON CONFLICT (video_id, category_id)
                    DO UPDATE SET score = GREATEST(video_categories.score, EXCLUDED.score)
                    """,
                videoId,
                e.getKey(),
                categoryTableScore
            );
            jdbcTemplate.update(
                """
                    INSERT INTO video_category_scores
                        (video_id, category_id, score, source, created_at, updated_at)
                    VALUES (?, ?, ?, 'cu_tags', NOW(), NOW())
                    ON CONFLICT (video_id, category_id) DO UPDATE SET
                        score = GREATEST(video_category_scores.score, EXCLUDED.score),
                        source = EXCLUDED.source,
                        updated_at = NOW()
                    """,
                videoId,
                e.getKey(),
                discoveryScore
            );
        }
    }

    private SemanticTagEntity resolveTag(String raw) {
        String key = raw.trim().toLowerCase(Locale.ROOT).replace("#", "").trim();
        return semanticTagRepository
            .findBySlugIgnoreCase(key)
            .or(() -> aliasRepository.findByAliasIgnoreCase(key).map(SemanticTagAliasEntity::getTag))
            .orElse(null);
    }

    private static float clamp01(float v) {
        if (v < 0f) {
            return 0f;
        }
        if (v > 1f) {
            return 1f;
        }
        return v;
    }

    private static String blankTo(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            return "{}";
        }
    }
}
