package com.vibely.backend.moderation;

import com.vibely.backend.explore.service.ExploreCacheService;
import com.vibely.backend.video.Video;
import com.vibely.backend.video.VideoRepository;
import com.vibely.backend.video.VideoStatus;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * AI-first publication: published videos stay {@link VideoStatus#HIDDEN} until the moderation
 * worker returns ALLOW/LIMIT (applier promotes to READY). For You / Explore only list
 * {@code READY}, so held videos never appear there. The author's own profile may still list
 * {@code HIDDEN} with a client "Đang kiểm tra..." overlay (not clickable).
 *
 * <p>Only active when moderation is enabled and {@code apply-decisions=true}.
 */
@Service
public class ModerationPublicationHoldService {

    private static final Logger log = LoggerFactory.getLogger(ModerationPublicationHoldService.class);

    private final ModerationProperties properties;
    private final VideoRepository videoRepository;
    private final ModerationDecisionRepository decisionRepository;
    private final ExploreCacheService exploreCacheService;
    private final JdbcTemplate jdbcTemplate;
    private final ModerationJoinService joinService;

    public ModerationPublicationHoldService(
        ModerationProperties properties,
        VideoRepository videoRepository,
        ModerationDecisionRepository decisionRepository,
        ExploreCacheService exploreCacheService,
        JdbcTemplate jdbcTemplate,
        ModerationJoinService joinService
    ) {
        this.properties = properties;
        this.videoRepository = videoRepository;
        this.decisionRepository = decisionRepository;
        this.exploreCacheService = exploreCacheService;
        this.jdbcTemplate = jdbcTemplate;
        this.joinService = joinService;
    }

    public boolean isHoldActive() {
        return properties.isEnabled() && properties.isApplyDecisions();
    }

    /**
     * After processing reaches READY, or on Studio publish: keep off public surfaces until AI decides.
     */
    @Transactional
    public void holdIfPendingModeration(Video video) {
        if (!isHoldActive() || video == null || video.getId() == null) {
            return;
        }
        if (video.isStudioDraft()) {
            return;
        }
        if (video.getStatus() != VideoStatus.READY && video.getStatus() != VideoStatus.HIDDEN) {
            return;
        }
        if (hasPublicClearance(video.getId())) {
            promoteReady(video);
            return;
        }
        if (video.getStatus() != VideoStatus.HIDDEN) {
            video.setStatus(VideoStatus.HIDDEN);
            videoRepository.save(video);
            log.info("Held videoId={} HIDDEN pending AI moderation", video.getId());
            evictExploreCaches();
        }
    }

    /**
     * Unstick HIDDEN videos: apply existing ALLOW/LIMIT (even legacy shadow rows),
     * force-enqueue moderation when CU is done, soft-promote after timeout.
     */
    @Transactional
    public int reconcileStuckHolds() {
        if (!isHoldActive()) {
            return 0;
        }
        int enqueueAfter = Math.max(1, properties.getPublicationHoldEnqueueAfterMinutes());
        int holdTimeout = Math.max(enqueueAfter + 1, properties.getPublicationHoldTimeoutMinutes());
        int fixed = 0;

        // 1) Already cleared by AI (ALLOW/LIMIT/REVIEW) — REVIEW is visible to author, off FYP.
        List<Map<String, Object>> cleared = jdbcTemplate.queryForList(
            """
            SELECT v.id AS video_id
            FROM videos v
            JOIN moderation_decisions md ON md.video_id = v.id
            WHERE v.status = 'HIDDEN'
              AND COALESCE(v.studio_draft, FALSE) = FALSE
              AND md.effective_decision IN ('ALLOW', 'LIMIT', 'REVIEW')
            LIMIT 100
            """
        );
        for (Map<String, Object> row : cleared) {
            long videoId = ((Number) row.get("video_id")).longValue();
            Video video = videoRepository.findById(videoId).orElse(null);
            if (video == null) {
                continue;
            }
            decisionRepository.findByVideo_Id(videoId).ifPresent(d -> {
                if (d.isShadow()) {
                    d.setShadow(false);
                    decisionRepository.save(d);
                }
            });
            if (promoteReady(video)) {
                fixed++;
                log.info("Released hold videoId={} after ALLOW/LIMIT decision", videoId);
            }
        }

        // 2) CU done but moderation never ran / stuck — force enqueue.
        List<Map<String, Object>> needEnqueue = jdbcTemplate.queryForList(
            """
            SELECT v.id AS video_id
            FROM videos v
            WHERE v.status = 'HIDDEN'
              AND COALESCE(v.studio_draft, FALSE) = FALSE
              AND v.created_at < NOW() - (INTERVAL '1 minute' * ?)
              AND EXISTS (
                  SELECT 1 FROM analysis_jobs aj
                  WHERE aj.video_id = v.id AND aj.status = 'COMPLETED'
              )
              AND NOT EXISTS (
                  SELECT 1 FROM moderation_decisions md
                  WHERE md.video_id = v.id
                    AND md.effective_decision IN ('ALLOW', 'LIMIT', 'BLOCK', 'DELETE')
              )
            ORDER BY v.created_at ASC
            LIMIT 40
            """,
            enqueueAfter
        );
        for (Map<String, Object> row : needEnqueue) {
            long videoId = ((Number) row.get("video_id")).longValue();
            try {
                Long jobId = joinService.forceReevaluate(videoId);
                if (jobId != null) {
                    log.info("Hold reconcile enqueued moderation videoId={} jobId={}", videoId, jobId);
                }
            } catch (Exception ex) {
                log.warn("Hold reconcile enqueue failed videoId={}: {}", videoId, ex.getMessage());
            }
        }

        // 2b) No CU yet after enqueue window — still try soft-timeout enqueue path via join
        //     (originality soft timeout) and log for ops.
        List<Map<String, Object>> noCu = jdbcTemplate.queryForList(
            """
            SELECT v.id AS video_id
            FROM videos v
            WHERE v.status = 'HIDDEN'
              AND COALESCE(v.studio_draft, FALSE) = FALSE
              AND v.created_at < NOW() - (INTERVAL '1 minute' * ?)
              AND NOT EXISTS (
                  SELECT 1 FROM analysis_jobs aj
                  WHERE aj.video_id = v.id AND aj.status = 'COMPLETED'
              )
            ORDER BY v.created_at ASC
            LIMIT 40
            """,
            enqueueAfter
        );
        for (Map<String, Object> row : noCu) {
            long videoId = ((Number) row.get("video_id")).longValue();
            log.warn("Hold reconcile: videoId={} still HIDDEN without completed CU", videoId);
        }

        // 3) Hard timeout — do not leave creators stuck if CU/moderation pipeline is down.
        List<Map<String, Object>> timedOut = jdbcTemplate.queryForList(
            """
            SELECT v.id AS video_id
            FROM videos v
            WHERE v.status = 'HIDDEN'
              AND COALESCE(v.studio_draft, FALSE) = FALSE
              AND v.created_at < NOW() - (INTERVAL '1 minute' * ?)
              AND NOT EXISTS (
                  SELECT 1 FROM moderation_decisions md
                  WHERE md.video_id = v.id
                    AND md.effective_decision IN ('BLOCK', 'DELETE')
              )
            ORDER BY v.created_at ASC
            LIMIT 50
            """,
            holdTimeout
        );
        for (Map<String, Object> row : timedOut) {
            long videoId = ((Number) row.get("video_id")).longValue();
            Video video = videoRepository.findById(videoId).orElse(null);
            if (video == null) {
                continue;
            }
            if (promoteReady(video)) {
                fixed++;
                log.warn(
                    "Soft-promoted HIDDEN videoId={} to READY after {}m hold timeout",
                    videoId,
                    holdTimeout
                );
            }
        }
        return fixed;
    }

    /**
     * True when an ALLOW/LIMIT decision exists. Shadow rows count once apply-decisions
     * is on — otherwise videos moderated in shadow stay HIDDEN forever.
     */
    private boolean hasPublicClearance(long videoId) {
        return decisionRepository.findByVideo_Id(videoId)
            .map(d -> {
                ModerationDecision eff = d.getEffectiveDecision();
                // REVIEW: author-visible READY, not explore — still clears publication hold.
                return eff == ModerationDecision.ALLOW
                    || eff == ModerationDecision.LIMIT
                    || eff == ModerationDecision.REVIEW;
            })
            .orElse(false);
    }

    private boolean promoteReady(Video video) {
        if (video.getStatus() == VideoStatus.READY) {
            return false;
        }
        video.setStatus(VideoStatus.READY);
        videoRepository.save(video);
        evictExploreCaches();
        return true;
    }

    private void evictExploreCaches() {
        exploreCacheService.evictByPrefix("trending");
        exploreCacheService.evictByPrefix("category:");
        exploreCacheService.evictByPrefix("related:");
        exploreCacheService.evictByPrefix("forYou");
        exploreCacheService.evictByPrefix("search:");
    }
}
