package com.vibely.backend.moderation;

import com.vibely.backend.admin.AdminBannedUserInfo;
import com.vibely.backend.auth.repository.RefreshTokenRepository;
import com.vibely.backend.user.entity.Role;
import com.vibely.backend.user.entity.User;
import com.vibely.backend.user.entity.UserAccountStatus;
import com.vibely.backend.user.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Auto-ban authors when AI moderation issues BLOCK/DELETE for severe policy labels.
 * System bans set bannedByAdminId=null; creator can still use ban-appeal flow.
 */
@Service
public class ModerationAutoBanService {

    private static final Logger log = LoggerFactory.getLogger(ModerationAutoBanService.class);

    private static final Set<String> AUTO_BAN_LABELS = Set.of(
        "sexual_content",
        "violence",
        "spam",
        "child_safety",
        "terrorism"
    );

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JdbcTemplate jdbcTemplate;
    private final ModerationProperties properties;

    public ModerationAutoBanService(
        UserRepository userRepository,
        RefreshTokenRepository refreshTokenRepository,
        JdbcTemplate jdbcTemplate,
        ModerationProperties properties
    ) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.jdbcTemplate = jdbcTemplate;
        this.properties = properties;
    }

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
        if (request.getPolicyResults() != null) {
            for (ModerationCompleteRequest.PolicyResultItem item : request.getPolicyResults()) {
                if (item == null || item.getLabel() == null) {
                    continue;
                }
                if (AUTO_BAN_LABELS.contains(item.getLabel().trim().toLowerCase(Locale.ROOT))) {
                    return true;
                }
            }
        }
        if (request.getEvidence() != null) {
            for (ModerationCompleteRequest.EvidenceItem item : request.getEvidence()) {
                if (item == null || item.getReasonCode() == null) {
                    continue;
                }
                String code = item.getReasonCode().toLowerCase(Locale.ROOT);
                if (code.contains("nsfw")
                    || code.contains("violence")
                    || code.contains("spam")
                    || code.contains("child")
                    || code.contains("terror")) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Bans the author, revokes all refresh tokens, and soft-removes public videos.
     *
     * @return banned user info for email notification, or null if skipped
     */
    @Transactional
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

        // Hide remaining public posts so profile/feed stay empty after ban.
        int hidden = jdbcTemplate.update(
            """
            UPDATE videos
            SET status = 'REMOVED'
            WHERE author_id = ?
              AND status IN ('READY', 'HIDDEN', 'REPORTED')
            """,
            authorId
        );
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
