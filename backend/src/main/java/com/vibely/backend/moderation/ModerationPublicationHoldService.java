package com.vibely.backend.moderation;

import com.vibely.backend.video.Video;
import com.vibely.backend.video.VideoRepository;
import com.vibely.backend.video.VideoStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * AI-first publication: published videos stay {@link VideoStatus#HIDDEN} until the moderation
 * worker returns ALLOW/LIMIT (applier promotes to READY). For You / Explore only list
 * {@code READY}, so held videos never appear there. The author's own profile may still list
 * {@code HIDDEN} with a client "Đang kiểm tra..." overlay.
 *
 * <p>Only active when moderation is enabled and {@code apply-decisions=true}.
 */
@Service
public class ModerationPublicationHoldService {

    private static final Logger log = LoggerFactory.getLogger(ModerationPublicationHoldService.class);

    private final ModerationProperties properties;
    private final VideoRepository videoRepository;
    private final ModerationDecisionRepository decisionRepository;

    public ModerationPublicationHoldService(
        ModerationProperties properties,
        VideoRepository videoRepository,
        ModerationDecisionRepository decisionRepository
    ) {
        this.properties = properties;
        this.videoRepository = videoRepository;
        this.decisionRepository = decisionRepository;
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
            if (video.getStatus() == VideoStatus.HIDDEN) {
                video.setStatus(VideoStatus.READY);
                videoRepository.save(video);
            }
            return;
        }
        if (video.getStatus() != VideoStatus.HIDDEN) {
            video.setStatus(VideoStatus.HIDDEN);
            videoRepository.save(video);
            log.info("Held videoId={} HIDDEN pending AI moderation", video.getId());
        }
    }

    /** True when a non-shadow decision already cleared the video for public READY. */
    private boolean hasPublicClearance(long videoId) {
        return decisionRepository.findByVideo_Id(videoId)
            .filter(d -> !d.isShadow())
            .map(d -> {
                ModerationDecision eff = d.getEffectiveDecision();
                return eff == ModerationDecision.ALLOW || eff == ModerationDecision.LIMIT;
            })
            .orElse(false);
    }
}
