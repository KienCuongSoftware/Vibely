package com.vibely.backend.moderation;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Closes open moderation queue rows when videos are soft-deleted or authors are banned,
 * so the admin review list does not keep orphaned items.
 */
@Service
public class ModerationReviewQueueCleanupService {

    private final JdbcTemplate jdbcTemplate;

    public ModerationReviewQueueCleanupService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional
    public int dismissOpenForVideo(long videoId) {
        return jdbcTemplate.update(
            """
            UPDATE moderation_review_queue
            SET queue_state = 'DISMISSED', updated_at = NOW()
            WHERE video_id = ?
              AND queue_state IN ('OPEN', 'CLAIMED')
            """,
            videoId
        );
    }

    @Transactional
    public int dismissOpenForAuthor(long authorId) {
        return jdbcTemplate.update(
            """
            UPDATE moderation_review_queue q
            SET queue_state = 'DISMISSED', updated_at = NOW()
            FROM videos v
            WHERE v.id = q.video_id
              AND v.author_id = ?
              AND q.queue_state IN ('OPEN', 'CLAIMED')
            """,
            authorId
        );
    }

    @Transactional
    public int dismissOpenForRemovedVideos() {
        return jdbcTemplate.update(
            """
            UPDATE moderation_review_queue q
            SET queue_state = 'DISMISSED', updated_at = NOW()
            FROM videos v
            WHERE v.id = q.video_id
              AND v.status = 'REMOVED'
              AND q.queue_state IN ('OPEN', 'CLAIMED')
            """
        );
    }
}
