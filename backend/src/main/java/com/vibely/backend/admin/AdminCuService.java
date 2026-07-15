package com.vibely.backend.admin;

import com.vibely.backend.common.BadRequestException;
import com.vibely.backend.common.NotFoundException;
import com.vibely.backend.contentunderstanding.AnalysisJobEntity;
import com.vibely.backend.contentunderstanding.AnalysisJobRepository;
import com.vibely.backend.contentunderstanding.AnalysisJobStatus;
import com.vibely.backend.contentunderstanding.CategoryTagMappingEntity;
import com.vibely.backend.contentunderstanding.CategoryTagMappingRepository;
import com.vibely.backend.contentunderstanding.ContentUnderstandingEnqueueService;
import com.vibely.backend.contentunderstanding.SemanticTagEntity;
import com.vibely.backend.contentunderstanding.SemanticTagRepository;
import com.vibely.backend.explore.Category;
import com.vibely.backend.explore.CategoryRepository;
import com.vibely.backend.video.Video;
import com.vibely.backend.video.VideoPublicIds;
import com.vibely.backend.video.VideoRepository;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminCuService {

    private final CategoryTagMappingRepository mappingRepository;
    private final CategoryRepository categoryRepository;
    private final SemanticTagRepository semanticTagRepository;
    private final AnalysisJobRepository analysisJobRepository;
    private final VideoRepository videoRepository;
    private final ContentUnderstandingEnqueueService enqueueService;
    private final JdbcTemplate jdbcTemplate;

    public AdminCuService(
        CategoryTagMappingRepository mappingRepository,
        CategoryRepository categoryRepository,
        SemanticTagRepository semanticTagRepository,
        AnalysisJobRepository analysisJobRepository,
        VideoRepository videoRepository,
        ContentUnderstandingEnqueueService enqueueService,
        JdbcTemplate jdbcTemplate
    ) {
        this.mappingRepository = mappingRepository;
        this.categoryRepository = categoryRepository;
        this.semanticTagRepository = semanticTagRepository;
        this.analysisJobRepository = analysisJobRepository;
        this.videoRepository = videoRepository;
        this.enqueueService = enqueueService;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional(readOnly = true)
    public List<AdminCuMappingDto> listMappings() {
        Map<Long, Category> categories = new HashMap<>();
        for (Category c : categoryRepository.findAll()) {
            categories.put(c.getId(), c);
        }
        Map<Long, SemanticTagEntity> tags = new HashMap<>();
        for (SemanticTagEntity t : semanticTagRepository.findAll()) {
            tags.put(t.getId(), t);
        }
        List<AdminCuMappingDto> out = new ArrayList<>();
        for (CategoryTagMappingEntity row : mappingRepository.findAllByOrderByPriorityAscIdAsc()) {
            Category cat = categories.get(row.getCategoryId());
            SemanticTagEntity tag = tags.get(row.getTagId());
            out.add(
                new AdminCuMappingDto(
                    row.getId(),
                    row.getCategoryId(),
                    cat == null ? null : cat.getSlug(),
                    cat == null ? null : cat.getName(),
                    row.getTagId(),
                    tag == null ? null : tag.getSlug(),
                    tag == null ? null : tag.getName(),
                    row.getWeight(),
                    row.getPriority(),
                    row.getRule(),
                    row.getMinTagConfidence()
                )
            );
        }
        return out;
    }

    @Transactional(readOnly = true)
    public List<AdminCuOptionDto> listCategories() {
        return categoryRepository.findByEnabledTrueOrderByNameAsc().stream()
            .map(c -> new AdminCuOptionDto(c.getId(), c.getSlug(), c.getName()))
            .toList();
    }

    @Transactional(readOnly = true)
    public List<AdminCuOptionDto> listSemanticTags() {
        return semanticTagRepository.findByStatus("active").stream()
            .map(t -> new AdminCuOptionDto(t.getId(), t.getSlug(), t.getName()))
            .toList();
    }

    @Transactional
    public AdminCuMappingDto createMapping(AdminCuMappingUpsertRequest body) {
        Category category = resolveCategory(body.categoryId(), body.categorySlug());
        SemanticTagEntity tag = resolveTag(body.tagId(), body.tagSlug());
        if (mappingRepository.existsByCategoryIdAndTagId(category.getId(), tag.getId())) {
            throw new BadRequestException("Mapping category↔tag đã tồn tại.");
        }
        CategoryTagMappingEntity row = new CategoryTagMappingEntity();
        row.setCategoryId(category.getId());
        row.setTagId(tag.getId());
        applyUpsertFields(row, body);
        mappingRepository.save(row);
        return listMappings().stream()
            .filter(m -> m.id().equals(row.getId()))
            .findFirst()
            .orElseThrow();
    }

    @Transactional
    public AdminCuMappingDto updateMapping(Long id, AdminCuMappingUpsertRequest body) {
        CategoryTagMappingEntity row = mappingRepository
            .findById(id)
            .orElseThrow(() -> new NotFoundException("Mapping không tồn tại"));
        if (body.categoryId() != null || (body.categorySlug() != null && !body.categorySlug().isBlank())) {
            Category category = resolveCategory(body.categoryId(), body.categorySlug());
            row.setCategoryId(category.getId());
        }
        if (body.tagId() != null || (body.tagSlug() != null && !body.tagSlug().isBlank())) {
            SemanticTagEntity tag = resolveTag(body.tagId(), body.tagSlug());
            row.setTagId(tag.getId());
        }
        if (mappingRepository.findByCategoryIdAndTagId(row.getCategoryId(), row.getTagId())
            .filter(other -> !other.getId().equals(id))
            .isPresent()) {
            throw new BadRequestException("Mapping category↔tag đã tồn tại.");
        }
        applyUpsertFields(row, body);
        mappingRepository.save(row);
        return listMappings().stream()
            .filter(m -> m.id().equals(id))
            .findFirst()
            .orElseThrow();
    }

    @Transactional
    public void deleteMapping(Long id) {
        if (!mappingRepository.existsById(id)) {
            throw new NotFoundException("Mapping không tồn tại");
        }
        mappingRepository.deleteById(id);
    }

    @Transactional
    public AdminCuEnqueueResponse reanalyze(AdminCuReanalyzeRequest body) {
        Video video = resolveVideo(body);
        Optional<UUID> jobId = enqueueService.enqueue(
            video,
            "admin",
            body.priority() == null ? 200 : body.priority(),
            body.force() == null || body.force()
        );
        if (jobId.isEmpty()) {
            throw new BadRequestException("Không thể enqueue (job đang RUNNING hoặc CU tắt / draft).");
        }
        return new AdminCuEnqueueResponse(1, List.of(jobId.get().toString()), video.getId());
    }

    @Transactional
    public AdminCuEnqueueResponse backfill(AdminCuBackfillRequest body) {
        int limit = body.limit() == null ? 50 : Math.max(1, Math.min(body.limit(), 500));
        boolean onlyMissing = body.onlyMissing() == null || body.onlyMissing();
        int priority = body.priority() == null ? 50 : body.priority();
        boolean force = body.force() != null && body.force();

        List<Long> videoIds;
        if (onlyMissing) {
            videoIds = jdbcTemplate.queryForList(
                """
                    SELECT v.id
                    FROM videos v
                    WHERE v.status = 'READY'
                      AND coalesce(v.studio_draft, false) = false
                      AND NOT EXISTS (
                        SELECT 1 FROM analysis_jobs j
                        WHERE j.video_id = v.id AND j.status = 'COMPLETED'
                      )
                    ORDER BY v.created_at DESC
                    LIMIT ?
                    """,
                Long.class,
                limit
            );
        } else {
            videoIds = jdbcTemplate.queryForList(
                """
                    SELECT v.id FROM videos v
                    WHERE v.status = 'READY'
                      AND coalesce(v.studio_draft, false) = false
                    ORDER BY v.created_at DESC
                    LIMIT ?
                    """,
                Long.class,
                limit
            );
        }

        List<String> jobIds = new ArrayList<>();
        for (Long id : videoIds) {
            Video video = videoRepository.findById(id).orElse(null);
            if (video == null) {
                continue;
            }
            enqueueService.enqueue(video, "backfill", priority, force).ifPresent(uuid -> jobIds.add(uuid.toString()));
        }
        return new AdminCuEnqueueResponse(jobIds.size(), jobIds, null);
    }

    @Transactional(readOnly = true)
    public AdminCuJobPageResponse listJobs(int page, int size, String status) {
        int pageSize = Math.max(1, Math.min(size, 100));
        PageRequest pr = PageRequest.of(Math.max(page, 0), pageSize, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<AnalysisJobEntity> result;
        if (status != null && !status.isBlank()) {
            AnalysisJobStatus st;
            try {
                st = AnalysisJobStatus.valueOf(status.trim().toUpperCase(Locale.ROOT));
            } catch (IllegalArgumentException ex) {
                throw new BadRequestException("status không hợp lệ");
            }
            result = analysisJobRepository.findByStatus(st, pr);
        } else {
            result = analysisJobRepository.findAll(pr);
        }
        List<AdminCuJobDto> items = result.getContent().stream()
            .map(
                j -> new AdminCuJobDto(
                    j.getId().toString(),
                    j.getVideo() == null ? null : j.getVideo().getId(),
                    j.getVideo() == null || j.getVideo().getPublicId() == null
                        ? null
                        : j.getVideo().getPublicId().toString(),
                    j.getStatus().name(),
                    j.getTriggerReason(),
                    j.getPriority(),
                    j.getAttempts(),
                    j.getErrorMessage(),
                    j.getCreatedAt() == null ? null : j.getCreatedAt().toString(),
                    j.getFinishedAt() == null ? null : j.getFinishedAt().toString()
                )
            )
            .toList();
        return new AdminCuJobPageResponse(items, result.getTotalElements(), result.getNumber(), result.getSize());
    }

    private void applyUpsertFields(CategoryTagMappingEntity row, AdminCuMappingUpsertRequest body) {
        if (body.weight() != null) {
            row.setWeight(clampPositive(body.weight(), 0.01f, 10f));
        }
        if (body.priority() != null) {
            row.setPriority(body.priority());
        }
        if (body.rule() != null && !body.rule().isBlank()) {
            row.setRule(body.rule().trim());
        }
        if (body.minTagConfidence() != null) {
            row.setMinTagConfidence(clampPositive(body.minTagConfidence(), 0f, 1f));
        }
    }

    private Category resolveCategory(Long id, String slug) {
        if (id != null) {
            return categoryRepository.findById(id).orElseThrow(() -> new NotFoundException("Category không tồn tại"));
        }
        if (slug == null || slug.isBlank()) {
            throw new BadRequestException("categoryId hoặc categorySlug là bắt buộc");
        }
        return categoryRepository
            .findAll()
            .stream()
            .filter(c -> slug.equalsIgnoreCase(c.getSlug()))
            .findFirst()
            .orElseThrow(() -> new NotFoundException("Category không tồn tại"));
    }

    private SemanticTagEntity resolveTag(Long id, String slug) {
        if (id != null) {
            return semanticTagRepository.findById(id).orElseThrow(() -> new NotFoundException("Semantic tag không tồn tại"));
        }
        if (slug == null || slug.isBlank()) {
            throw new BadRequestException("tagId hoặc tagSlug là bắt buộc");
        }
        return semanticTagRepository
            .findBySlugIgnoreCase(slug.trim())
            .orElseThrow(() -> new NotFoundException("Semantic tag không tồn tại"));
    }

    private Video resolveVideo(AdminCuReanalyzeRequest body) {
        if (body.videoId() != null) {
            return videoRepository
                .findById(body.videoId())
                .orElseThrow(() -> new NotFoundException("Video không tồn tại"));
        }
        if (body.publicId() != null && !body.publicId().isBlank()) {
            return videoRepository
                .findByPublicId(VideoPublicIds.parse(body.publicId()))
                .orElseThrow(() -> new NotFoundException("Video không tồn tại"));
        }
        throw new BadRequestException("videoId hoặc publicId là bắt buộc");
    }

    private static float clampPositive(float v, float min, float max) {
        if (v < min) {
            return min;
        }
        if (v > max) {
            return max;
        }
        return v;
    }

    public record AdminCuOptionDto(Long id, String slug, String name) {
    }

    public record AdminCuMappingDto(
        Long id,
        Long categoryId,
        String categorySlug,
        String categoryName,
        Long tagId,
        String tagSlug,
        String tagName,
        float weight,
        int priority,
        String rule,
        float minTagConfidence
    ) {
    }

    public record AdminCuMappingUpsertRequest(
        Long categoryId,
        String categorySlug,
        Long tagId,
        String tagSlug,
        Float weight,
        Integer priority,
        String rule,
        Float minTagConfidence
    ) {
    }

    public record AdminCuReanalyzeRequest(Long videoId, String publicId, Boolean force, Integer priority) {
    }

    public record AdminCuBackfillRequest(Integer limit, Boolean onlyMissing, Boolean force, Integer priority) {
    }

    public record AdminCuEnqueueResponse(int enqueued, List<String> jobIds, Long videoId) {
    }

    public record AdminCuJobDto(
        String id,
        Long videoId,
        String videoPublicId,
        String status,
        String triggerReason,
        int priority,
        int attempts,
        String errorMessage,
        String createdAt,
        String finishedAt
    ) {
    }

    public record AdminCuJobPageResponse(List<AdminCuJobDto> items, long total, int page, int size) {
    }
}
