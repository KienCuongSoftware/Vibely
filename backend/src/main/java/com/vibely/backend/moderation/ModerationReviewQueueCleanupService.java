package com.vibely.backend.moderation;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Removes moderation queue / report rows when videos are soft-deleted or authors are banned,
 * so the admin review list does not keep orphaned items (soft-delete does not fire ON DELETE CASCADE).
 */
@Service
public class ModerationReviewQueueCleanupService {

    private static final Logger log = LoggerFactory.getLogger(ModerationReviewQueueCleanupService.class);

    private final JdbcTemplate jdbcTemplate;

    public ModerationReviewQueueCleanupService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /** Prefer {@link #purgeForVideo(long)} — kept for existing call sites. */
    @Transactional
    public int dismissOpenForVideo(long videoId) {
        return purgeForVideo(videoId);
    }

    @Transactional
    public int dismissOpenForAuthor(long authorId) {
        return purgeForAuthor(authorId);
    }

    @Transactional
    public int dismissOpenForRemovedVideos() {
        return purgeForRemovedVideos();
    }

    /**
     * Hard-delete moderation artifacts for one video (queue, appeals, jobs → reports/evidence, decisions).
     */
    @Transactional
    public int purgeForVideo(long videoId) {
        int appeals = jdbcTemplate.update(
            "DELETE FROM moderation_appeals WHERE video_id = ?",
            videoId
        );
        int queue = jdbcTemplate.update(
            "DELETE FROM moderation_review_queue WHERE video_id = ?",
            videoId
        );
        // Clear report FK before deleting jobs (decisions.report_id → SET NULL would also work).
        jdbcTemplate.update(
            "UPDATE moderation_decisions SET report_id = NULL WHERE video_id = ?",
            videoId
        );
        int decisions = jdbcTemplate.update(
            "DELETE FROM moderation_decisions WHERE video_id = ?",
            videoId
        );
        // Cascades: moderation_reports → evidence, policy_results; queue already deleted above.
        int jobs = jdbcTemplate.update(
            "DELETE FROM moderation_jobs WHERE video_id = ?",
            videoId
        );
        int total = appeals + queue + decisions + jobs;
        if (total > 0) {
            log.info(
                "Purged moderation for videoId={}: appeals={}, queue={}, decisions={}, jobs={}",
                videoId,
                appeals,
                queue,
                decisions,
                jobs
            );
        }
        return total;
    }

    @Transactional
    public int purgeForAuthor(long authorId) {
        int appeals = jdbcTemplate.update(
            """
            DELETE FROM moderation_appeals a
            USING videos v
            WHERE a.video_id = v.id
              AND v.author_id = ?
            """,
            authorId
        );
        int queue = jdbcTemplate.update(
            """
            DELETE FROM moderation_review_queue q
            USING videos v
            WHERE q.video_id = v.id
              AND v.author_id = ?
            """,
            authorId
        );
        jdbcTemplate.update(
            """
            UPDATE moderation_decisions d
            SET report_id = NULL
            FROM videos v
            WHERE d.video_id = v.id
              AND v.author_id = ?
            """,
            authorId
        );
        int decisions = jdbcTemplate.update(
            """
            DELETE FROM moderation_decisions d
            USING videos v
            WHERE d.video_id = v.id
              AND v.author_id = ?
            """,
            authorId
        );
        int jobs = jdbcTemplate.update(
            """
            DELETE FROM moderation_jobs j
            USING videos v
            WHERE j.video_id = v.id
              AND v.author_id = ?
            """,
            authorId
        );
        int total = appeals + queue + decisions + jobs;
        if (total > 0) {
            log.info(
                "Purged moderation for authorId={}: appeals={}, queue={}, decisions={}, jobs={}",
                authorId,
                appeals,
                queue,
                decisions,
                jobs
            );
        }
        return total;
    }

    /** One-shot / startup: remove moderation rows still attached to soft-deleted videos. */
    @Transactional
    public int purgeForRemovedVideos() {
        int appeals = jdbcTemplate.update(
            """
            DELETE FROM moderation_appeals a
            USING videos v
            WHERE a.video_id = v.id
              AND v.status = 'REMOVED'
            """
        );
        int queue = jdbcTemplate.update(
            """
            DELETE FROM moderation_review_queue q
            USING videos v
            WHERE q.video_id = v.id
              AND v.status = 'REMOVED'
            """
        );
        jdbcTemplate.update(
            """
            UPDATE moderation_decisions d
            SET report_id = NULL
            FROM videos v
            WHERE d.video_id = v.id
              AND v.status = 'REMOVED'
            """
        );
        int decisions = jdbcTemplate.update(
            """
            DELETE FROM moderation_decisions d
            USING videos v
            WHERE d.video_id = v.id
              AND v.status = 'REMOVED'
            """
        );
        int jobs = jdbcTemplate.update(
            """
            DELETE FROM moderation_jobs j
            USING videos v
            WHERE j.video_id = v.id
              AND v.status = 'REMOVED'
            """
        );
        int total = appeals + queue + decisions + jobs;
        if (total > 0) {
            log.info(
                "Purged moderation for REMOVED videos: appeals={}, queue={}, decisions={}, jobs={}",
                appeals,
                queue,
                decisions,
                jobs
            );
        }
        return total;
    }

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void purgeOrphansOnStartup() {
        try {
            int n = purgeForRemovedVideos();
            if (n > 0) {
                log.info("Startup moderation orphan cleanup removed {} related rows", n);
            }
        } catch (Exception ex) {
            log.warn("Startup moderation orphan cleanup skipped: {}", ex.getMessage());
        }
    }
}
