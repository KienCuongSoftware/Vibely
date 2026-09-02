package com.vibely.backend.video.service;

import com.vibely.backend.moderation.ModerationDecisionRepository;
import com.vibely.backend.moderation.ModerationPrivacyHoldService;
import com.vibely.backend.video.Video;
import com.vibely.backend.video.VideoPrivacy;
import com.vibely.backend.video.VideoStatus;
import org.springframework.stereotype.Service;

/**
 * Whether a READY video may appear on For You / Explore or be watched by non-authors.
 * Studio may show "only me" while {@link Video#getPrivacy()} is still PUBLIC — this service
 * uses moderation hold signals, not UI labels.
 */
@Service
public class PublicVideoVisibilityService {

    private final ModerationDecisionRepository moderationDecisionRepository;
    private final ModerationPrivacyHoldService moderationPrivacyHoldService;

    public PublicVideoVisibilityService(
        ModerationDecisionRepository moderationDecisionRepository,
        ModerationPrivacyHoldService moderationPrivacyHoldService
    ) {
        this.moderationDecisionRepository = moderationDecisionRepository;
        this.moderationPrivacyHoldService = moderationPrivacyHoldService;
    }

    public boolean isEligibleForPublicFeed(Video video) {
        if (video == null || video.isStudioDraft()) {
            return false;
        }
        if (video.getStatus() != VideoStatus.READY) {
            return false;
        }
        if (video.getScheduledAt() != null && video.getScheduledAt().isAfter(java.time.Instant.now())) {
            return false;
        }
        VideoPrivacy privacy = video.getPrivacy() == null ? VideoPrivacy.PUBLIC : video.getPrivacy();
        if (privacy != VideoPrivacy.PUBLIC) {
            return false;
        }
        return !isHeldOffPublicSurfaces(video);
    }

    public boolean isHeldOffPublicSurfaces(Video video) {
        if (video == null) {
            return true;
        }
        boolean reviewRequired = resolveReviewRequired(video.getId());
        if (moderationPrivacyHoldService.isReviewPending(video, reviewRequired)) {
            return true;
        }
        return moderationDecisionRepository.findByVideo_Id(video.getId())
            .map(d -> !d.isExploreEligible())
            .orElse(false);
    }

    private boolean resolveReviewRequired(Long videoId) {
        if (videoId == null) {
            return false;
        }
        return moderationDecisionRepository.findByVideo_Id(videoId)
            .map(d -> d.isReviewRequired())
            .orElse(false);
    }
}
