package com.vibely.backend.moderation;

import com.vibely.backend.video.Video;
import com.vibely.backend.video.VideoRepository;
import com.vibely.backend.video.VideoStatus;
import java.time.LocalDateTime;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ModerationDecisionApplier {

    private final ModerationDecisionRepository decisionRepository;
    private final VideoRepository videoRepository;

    public ModerationDecisionApplier(
        ModerationDecisionRepository decisionRepository,
        VideoRepository videoRepository
    ) {
        this.decisionRepository = decisionRepository;
        this.videoRepository = videoRepository;
    }

    /**
     * Map platform decision → explore eligibility + optional status mutation.
     * Shadow mode always records the decision row but does not change video.status.
     */
    @Transactional
    public void apply(Video video, ModerationReportEntity report, ModerationDecision decision, boolean shadow) {
        apply(video, report, decision, shadow, "SYSTEM");
    }

    /** Human moderator override always applies levers (never shadow). */
    @Transactional
    public void applyHuman(
        Video video,
        ModerationReportEntity report,
        ModerationDecision decision,
        String appliedBy
    ) {
        apply(video, report, decision, false, appliedBy == null || appliedBy.isBlank() ? "ADMIN" : appliedBy);
    }

    @Transactional
    public void apply(
        Video video,
        ModerationReportEntity report,
        ModerationDecision decision,
        boolean shadow,
        String appliedBy
    ) {
        boolean exploreEligible;
        boolean reviewRequired;
        String statusApplied;
        VideoStatus nextStatus = null;

        switch (decision) {
            case ALLOW -> {
                exploreEligible = true;
                reviewRequired = false;
                statusApplied = VideoStatus.READY.name();
                // Publication hold keeps new posts HIDDEN until AI ALLOW → promote to READY.
                if (!shadow
                    && (video.getStatus() == VideoStatus.HIDDEN
                        || video.getStatus() == VideoStatus.REMOVED
                        || video.getStatus() == VideoStatus.REPORTED)) {
                    nextStatus = VideoStatus.READY;
                }
            }
            case LIMIT -> {
                exploreEligible = false;
                reviewRequired = false;
                statusApplied = VideoStatus.READY.name();
                if (!shadow
                    && (video.getStatus() == VideoStatus.HIDDEN
                        || video.getStatus() == VideoStatus.REMOVED
                        || video.getStatus() == VideoStatus.REPORTED)) {
                    nextStatus = VideoStatus.READY;
                }
            }
            case REVIEW -> {
                exploreEligible = false;
                reviewRequired = true;
                statusApplied = VideoStatus.HIDDEN.name();
                if (!shadow) {
                    nextStatus = VideoStatus.HIDDEN;
                }
            }
            case BLOCK, DELETE -> {
                exploreEligible = false;
                reviewRequired = false;
                statusApplied = VideoStatus.REMOVED.name();
                if (!shadow) {
                    nextStatus = VideoStatus.REMOVED;
                }
            }
            default -> {
                exploreEligible = true;
                reviewRequired = false;
                statusApplied = video.getStatus() == null ? null : video.getStatus().name();
            }
        }

        ModerationDecisionEntity row = decisionRepository
            .findByVideo_Id(video.getId())
            .orElseGet(ModerationDecisionEntity::new);
        row.setVideo(video);
        row.setReport(report);
        row.setEffectiveDecision(decision);
        row.setExploreEligible(exploreEligible);
        row.setReviewRequired(reviewRequired);
        row.setStatusApplied(statusApplied);
        row.setAppliedAt(LocalDateTime.now());
        row.setAppliedBy(appliedBy == null || appliedBy.isBlank() ? "SYSTEM" : appliedBy);
        row.setShadow(shadow);
        decisionRepository.save(row);

        if (!shadow && nextStatus != null && video.getStatus() != nextStatus) {
            video.setStatus(nextStatus);
            videoRepository.save(video);
        }
    }
}
