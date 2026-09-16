package com.vibely.backend.explore.service;

import com.vibely.backend.explore.VideoCategory;
import com.vibely.backend.explore.VideoCategoryRepository;
import com.vibely.backend.video.Video;
import com.vibely.backend.video.VideoRepository;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Ensures every public READY video has at least one Explore-visible category (score &gt;= 1.5).
 */
@Service
public class VideoExploreCategoryEnsureService {

    private static final Logger log = LoggerFactory.getLogger(VideoExploreCategoryEnsureService.class);
    private static final int DEFAULT_BATCH = 200;

    private final JdbcTemplate jdbcTemplate;
    private final VideoRepository videoRepository;
    private final VideoCategoryRepository videoCategoryRepository;
    private final CategoryClassifierService categoryClassifierService;
    private final ExploreCacheService exploreCacheService;

    public VideoExploreCategoryEnsureService(
        JdbcTemplate jdbcTemplate,
        VideoRepository videoRepository,
        VideoCategoryRepository videoCategoryRepository,
        CategoryClassifierService categoryClassifierService,
        ExploreCacheService exploreCacheService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.videoRepository = videoRepository;
        this.videoCategoryRepository = videoCategoryRepository;
        this.categoryClassifierService = categoryClassifierService;
        this.exploreCacheService = exploreCacheService;
    }

    @Transactional
    public int backfillMissing(int limit) {
        int batch = limit <= 0 ? DEFAULT_BATCH : Math.min(limit, 1000);
        List<Long> ids = jdbcTemplate.queryForList(
            """
                SELECT v.id
                FROM videos v
                WHERE v.status = 'READY'
                  AND COALESCE(v.privacy, 'PUBLIC') = 'PUBLIC'
                  AND COALESCE(v.studio_draft, false) = false
                  AND (v.scheduled_at IS NULL OR v.scheduled_at <= NOW())
                  AND NOT EXISTS (
                      SELECT 1 FROM video_categories vc
                      WHERE vc.video_id = v.id AND vc.score >= 1.5
                  )
                ORDER BY v.id ASC
                LIMIT ?
                """,
            Long.class,
            batch
        );
        int fixed = 0;
        for (Long id : ids) {
            if (ensureVideoId(id)) {
                fixed++;
            }
        }
        if (fixed > 0) {
            exploreCacheService.evictByPrefix("trending");
            exploreCacheService.evictByPrefix("category:");
            log.info("Backfilled explore categories for {} videos", fixed);
        }
        return fixed;
    }

    @Transactional
    public boolean ensureVideoId(Long videoId) {
        if (videoId == null) {
            return false;
        }
        return videoRepository.findById(videoId).map(this::ensureVideo).orElse(false);
    }

    @Transactional
    public boolean ensureVideo(Video video) {
        if (video == null || video.getId() == null) {
            return false;
        }
        Integer count = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*) FROM video_categories
                WHERE video_id = ? AND score >= 1.5
                """,
            Integer.class,
            video.getId()
        );
        if (count != null && count > 0) {
            return false;
        }
        List<CategoryClassifierService.ScoredCategory> inferred = categoryClassifierService.inferCategories(
            video.getTitle(),
            video.getDescription(),
            video.getAudioTitle()
        );
        List<CategoryClassifierService.ScoredCategory> selected =
            categoryClassifierService.resolveCategoriesForPersist(inferred);
        if (selected.isEmpty()) {
            return false;
        }
        for (CategoryClassifierService.ScoredCategory scored : selected) {
            videoCategoryRepository.save(new VideoCategory(video, scored.category(), scored.score()));
        }
        return true;
    }
}
