package com.vibely.backend.moderation;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CreatorTrustService {

    private final JdbcTemplate jdbcTemplate;

    public CreatorTrustService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional(readOnly = true)
    public double getTrustScore(Long userId) {
        if (userId == null) {
            return 0.5;
        }
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
            "SELECT trust_score FROM creator_trust_scores WHERE user_id = ?",
            userId
        );
        if (rows.isEmpty() || rows.get(0).get("trust_score") == null) {
            return 0.5;
        }
        return clamp(((Number) rows.get(0).get("trust_score")).doubleValue());
    }

    @Transactional
    public void ensureRow(Long userId) {
        if (userId == null) {
            return;
        }
        jdbcTemplate.update(
            """
            INSERT INTO creator_trust_scores (user_id, trust_score, sample_count, updated_at)
            VALUES (?, 0.5, 0, NOW())
            ON CONFLICT (user_id) DO NOTHING
            """,
            userId
        );
    }

    @Transactional
    public void recordPolicyEvent(Long userId, Long videoId, String decision, String source) {
        if (userId == null || decision == null) {
            return;
        }
        ensureRow(userId);
        jdbcTemplate.update(
            """
            INSERT INTO creator_policy_history (user_id, video_id, decision, source, created_at)
            VALUES (?, ?, ?, ?, NOW())
            """,
            userId,
            videoId,
            decision.trim().toUpperCase(Locale.ROOT),
            source == null ? "SYSTEM" : source
        );
    }

    /**
     * Adjust trust after human or appeal outcomes.
     * delta in [-0.2, +0.2]; score stays in [0, 1].
     */
    @Transactional
    public void adjustTrust(Long userId, Long videoId, String decision, String source, double delta) {
        if (userId == null) {
            return;
        }
        ensureRow(userId);
        double current = getTrustScore(userId);
        double next = clamp(current + clampDelta(delta));
        jdbcTemplate.update(
            """
            UPDATE creator_trust_scores
            SET trust_score = ?, sample_count = sample_count + 1, updated_at = NOW()
            WHERE user_id = ?
            """,
            next,
            userId
        );
        recordPolicyEvent(userId, videoId, decision, source);
    }

    @Transactional
    public void onHumanResolve(
        Long authorUserId,
        Long videoId,
        ModerationDecision from,
        ModerationDecision to
    ) {
        if (authorUserId == null || to == null) {
            return;
        }
        double delta = 0.0;
        if (to == ModerationDecision.ALLOW && from != ModerationDecision.ALLOW) {
            delta = 0.04; // overturned restriction — creator slightly up
        } else if (to == ModerationDecision.BLOCK || to == ModerationDecision.DELETE) {
            delta = -0.08;
        } else if (to == ModerationDecision.LIMIT) {
            delta = -0.03;
        } else if (to == ModerationDecision.ALLOW && from == ModerationDecision.ALLOW) {
            delta = 0.01;
        }
        adjustTrust(authorUserId, videoId, to.name(), "HUMAN_RESOLVE", delta);
    }

    @Transactional
    public void onAppealResolved(
        Long authorUserId,
        Long videoId,
        String appealState,
        ModerationDecision resolved
    ) {
        if (authorUserId == null || resolved == null) {
            return;
        }
        String state = appealState == null ? "" : appealState.toUpperCase(Locale.ROOT);
        double delta = switch (state) {
            case "RESTORED" -> 0.06;
            case "SOFTENED" -> 0.03;
            case "UPHELD", "REJECTED" -> -0.02;
            default -> 0.0;
        };
        if (resolved == ModerationDecision.BLOCK || resolved == ModerationDecision.DELETE) {
            delta = Math.min(delta, -0.05);
        }
        adjustTrust(authorUserId, videoId, resolved.name(), "APPEAL_" + state, delta);
    }

    @Transactional
    public void onAiAllow(Long authorUserId, Long videoId) {
        if (authorUserId == null) {
            return;
        }
        adjustTrust(authorUserId, videoId, "ALLOW", "AI_ALLOW", 0.005);
    }

    private static double clamp(double v) {
        return Math.max(0.0, Math.min(1.0, v));
    }

    private static double clampDelta(double v) {
        return Math.max(-0.2, Math.min(0.2, v));
    }
}
