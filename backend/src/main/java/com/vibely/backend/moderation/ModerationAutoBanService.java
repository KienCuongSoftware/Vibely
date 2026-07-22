package com.vibely.backend.moderation;

import com.vibely.backend.admin.AdminBannedUserInfo;
import com.vibely.backend.auth.repository.RefreshTokenRepository;
import com.vibely.backend.user.entity.Role;
import com.vibely.backend.user.entity.User;
import com.vibely.backend.user.entity.UserAccountStatus;
import com.vibely.backend.user.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Auto-ban authors only for <strong>caption lexicon</strong> BLOCK hits — never for
 * visual CLIP / OCR plugins (high false-positive rate on normal videos).
 * System bans set bannedByAdminId=null; creator can still use ban-appeal flow.
 */
@Service
public class ModerationAutoBanService {

    private static final Logger log = LoggerFactory.getLogger(ModerationAutoBanService.class);

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JdbcTemplate jdbcTemplate;
    private final ModerationProperties properties;
    private final ModerationReviewQueueCleanupService reviewQueueCleanupService;

    public ModerationAutoBanService(
        UserRepository userRepository,
        RefreshTokenRepository refreshTokenRepository,
        JdbcTemplate jdbcTemplate,
        ModerationProperties properties,
        ModerationReviewQueueCleanupService reviewQueueCleanupService
    ) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.jdbcTemplate = jdbcTemplate;
        this.properties = properties;
        this.reviewQueueCleanupService = reviewQueueCleanupService;
    }

    /**
     * AI worker path: do <em>not</em> ban on visual NSFW/violence plugin BLOCK.
     * Caption gate bans separately via {@link #banAuthorForModeration}.
     */
    public boolean shouldAutoBan(ModerationDecision decision, ModerationCompleteRequest request) {
        if (!properties.isAutoBanOnBlock()) {
            return false;
        }
        if (decision != ModerationDecision.BLOCK && decision != ModerationDecision.DELETE) {
            return false;
        }
        if (request == null) {
            return false;
        }
        // Only caption lexicon firings — never plugin.* / tag.* visual cues.
        boolean lexHit = false;
        if (request.getEvidence() != null) {
            for (ModerationCompleteRequest.EvidenceItem item : request.getEvidence()) {
                if (item == null || item.getReasonCode() == null) {
                    continue;
                }
                String code = item.getReasonCode().trim().toLowerCase(Locale.ROOT);
                if (code.startsWith("lex.")) {
                    lexHit = true;
                    break;
                }
            }
        }
        if (!lexHit && request.getPolicyResults() != null) {
            for (ModerationCompleteRequest.PolicyResultItem item : request.getPolicyResults()) {
                if (item == null || item.getRuleCodes() == null) {
                    continue;
                }
                for (String rc : item.getRuleCodes()) {
                    if (rc != null && rc.trim().toLowerCase(Locale.ROOT).startsWith("lex.")) {
                        lexHit = true;
                        break;
                    }
                }
                if (lexHit) {
                    break;
                }
            }
        }
        if (!lexHit) {
            log.info(
                "Skip AI auto-ban (no caption lex hit) decision={} risk={}",
                decision,
                request.getRisk()
            );
            return false;
        }
        Integer risk = request.getRisk();
        Double confidence = request.getConfidence();
        if (risk == null || risk < 40) {
            return false;
        }
        if (confidence == null || confidence < 0.4) {
            return false;
        }
        return true;
    }

    /**
     * Bans the author, revokes all refresh tokens, and soft-removes public videos.
     * Runs in {@code REQUIRES_NEW} so a caption-gate ban commits even when the outer
     * publish/update transaction rolls back afterward.
     *
     * @return banned user info for email notification, or null if skipped
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public AdminBannedUserInfo banAuthorForModeration(
        Long authorId,
        long videoId,
        ModerationDecision decision,
        String reason
    ) {
        if (authorId == null) {
            return null;
        }
        User target = userRepository.findById(authorId).orElse(null);
        if (target == null || target.isBanned()) {
            return null;
        }
        if (target.getRole() == Role.ADMIN) {
            log.warn("Skip auto-ban for ADMIN userId={} videoId={}", authorId, videoId);
            return null;
        }

        String banReason = normalizeReason(reason, decision, videoId);
        target.setAccountStatus(UserAccountStatus.BANNED);
        target.setBanReason(banReason);
        target.setBannedAt(LocalDateTime.now());
        target.setBannedByAdminId(null);
        target.setDeactivatedAt(null);
        userRepository.save(target);
        refreshTokenRepository.revokeAllByUserId(target.getId());

        int hidden = jdbcTemplate.update(
            """
            UPDATE videos
            SET status = 'REMOVED'
            WHERE author_id = ?
              AND status IN ('READY', 'HIDDEN', 'REPORTED')
            """,
            authorId
        );
        reviewQueueCleanupService.purgeForAuthor(authorId);
        log.info(
            "AI auto-ban userId={} videoId={} decision={} removedVideos={}",
            authorId,
            videoId,
            decision,
            hidden
        );
        return new AdminBannedUserInfo(
            target.getId(),
            target.getUsername(),
            target.getDisplayName(),
            target.getEmail(),
            BanReasonFormatter.forDisplay(target.getBanReason()),
            target.getBannedAt()
        );
    }

    private String normalizeReason(String reason, ModerationDecision decision, long videoId) {
        String base = reason == null || reason.isBlank()
            ? "Vi phạm chính sách nội dung (AI moderation)"
            : BanReasonFormatter.forDisplay(reason.trim());
        if (base.length() < 5) {
            base = "Vi phạm chính sách cộng đồng";
        }
        if (base.length() > 500) {
            return base.substring(0, 500);
        }
        return base;
    }
}
