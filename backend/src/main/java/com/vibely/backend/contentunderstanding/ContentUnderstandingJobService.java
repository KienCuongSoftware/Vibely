package com.vibely.backend.contentunderstanding;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vibely.backend.common.BadRequestException;
import com.vibely.backend.common.NotFoundException;
import com.vibely.backend.video.Video;
import java.time.LocalDateTime;
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
    private final VideoSemanticTagRepository videoSemanticTagRepository;
    private final SemanticTagRepository semanticTagRepository;
    private final SemanticTagAliasRepository aliasRepository;
    private final ContentFeatureRepository contentFeatureRepository;
    private final ContentUnderstandingProperties properties;
    private final ObjectMapper objectMapper;
    private final JdbcTemplate jdbcTemplate;

    public ContentUnderstandingJobService(
        AnalysisJobRepository jobRepository,
        VideoSemanticTagRepository videoSemanticTagRepository,
        SemanticTagRepository semanticTagRepository,
        SemanticTagAliasRepository aliasRepository,
        ContentFeatureRepository contentFeatureRepository,
        ContentUnderstandingProperties properties,
        ObjectMapper objectMapper,
        JdbcTemplate jdbcTemplate
    ) {
        this.jobRepository = jobRepository;
        this.videoSemanticTagRepository = videoSemanticTagRepository;
        this.semanticTagRepository = semanticTagRepository;
        this.aliasRepository = aliasRepository;
        this.contentFeatureRepository = contentFeatureRepository;
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.jdbcTemplate = jdbcTemplate;
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

        videoSemanticTagRepository.deleteByVideoId(videoId);
        videoSemanticTagRepository.flush();

        List<CuCompleteRequest.TagItem> tags =
            request.getSemanticTags() == null ? List.of() : request.getSemanticTags();
        Map<Long, Float> tagScores = new HashMap<>();
        for (CuCompleteRequest.TagItem item : tags) {
            if (item == null || item.getSlug() == null || item.getSlug().isBlank()) {
                continue;
            }
            SemanticTagEntity tag = resolveTag(item.getSlug());
            if (tag == null) {
                continue;
            }
            float conf = clamp01(item.getConfidence() == null ? 0.5f : item.getConfidence());
            VideoSemanticTagEntity row = new VideoSemanticTagEntity();
            row.setVideoId(videoId);
            row.setTagId(tag.getId());
            row.setConfidence(conf);
            row.setSource(blankTo(item.getSource(), "fusion"));
            row.setModelVersion(blankTo(item.getModelVersion(), job.getModelBundleVersion()));
            row.setReason(blankTo(item.getReason(), "phase1"));
            row.setEvidence(toJson(item.getEvidence() == null ? Map.of() : item.getEvidence()));
            videoSemanticTagRepository.save(row);
            tagScores.merge(tag.getId(), conf, Math::max);
        }

        ContentFeatureEntity features = contentFeatureRepository.findById(videoId).orElseGet(() -> {
            ContentFeatureEntity created = new ContentFeatureEntity();
            created.setVideo(video);
            return created;
        });
        features.setVideo(video);
        features.setFeatureVersion(blankTo(request.getFeatureVersion(), "cu-phase1"));
        features.setContentSha256(request.getContentSha256());
        features.setMetadata(toJson(request.getMetadataFeatures() == null ? Map.of() : request.getMetadataFeatures()));
        features.setOcr(toJson(request.getOcrFeatures() == null ? Map.of() : request.getOcrFeatures()));
        contentFeatureRepository.save(features);

        projectCategories(videoId, tagScores);

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
            if (e.getValue() < 0.5) {
                continue;
            }
            jdbcTemplate.update(
                """
                    INSERT INTO video_categories (video_id, category_id, score, created_at)
                    VALUES (?, ?, ?, NOW())
                    ON CONFLICT (video_id, category_id)
                    DO UPDATE SET score = GREATEST(video_categories.score, EXCLUDED.score)
                    """,
                videoId,
                e.getKey(),
                e.getValue()
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
