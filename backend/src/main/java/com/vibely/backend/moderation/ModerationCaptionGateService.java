package com.vibely.backend.moderation;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vibely.backend.admin.AdminAccountBanEmailService;
import com.vibely.backend.admin.AdminBannedUserInfo;
import com.vibely.backend.auth.exception.AccountBannedException;
import com.vibely.backend.common.BadRequestException;
import com.vibely.backend.video.Video;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import java.util.regex.PatternSyntaxException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.util.StringUtils;

/**
 * Sync caption / description gate so spam bait cannot go live while waiting for the
 * async moderation worker. Severe hits ban + return ACCOUNT_BANNED so clients force logout.
 */
@Service
public class ModerationCaptionGateService {

    private static final Logger log = LoggerFactory.getLogger(ModerationCaptionGateService.class);

    /** Always-on patterns (independent of DB / V70 apply state). */
    private static final List<Pattern> BUILTIN_SEVERE = List.of(
        // follow for/of nudes, follow 4 nudes, etc.
        Pattern.compile("\\bfollow\\s*(?:for|of|4)\\s*nudes?\\b", Pattern.CASE_INSENSITIVE),
        Pattern.compile("\\bfollow\\s+me\\s+for\\s+nudes?\\b", Pattern.CASE_INSENSITIVE),
        Pattern.compile("\\bnudes?\\s+for\\s+follow\\b", Pattern.CASE_INSENSITIVE),
        Pattern.compile("\\bfree\\s+nudes?\\b", Pattern.CASE_INSENSITIVE),
        Pattern.compile("\\blink\\s+in\\s+bio\\s+for\\s+nudes?\\b", Pattern.CASE_INSENSITIVE),
        Pattern.compile("\\bonly\\s*fans\\b", Pattern.CASE_INSENSITIVE),
        Pattern.compile("\\btelegram\\s*@\\w+", Pattern.CASE_INSENSITIVE)
    );

    private final ModerationProperties properties;
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    private final ModerationAutoBanService autoBanService;
    private final AdminAccountBanEmailService accountBanEmailService;
    private final TransactionTemplate requiresNewTx;

    public ModerationCaptionGateService(
        ModerationProperties properties,
        JdbcTemplate jdbcTemplate,
        ObjectMapper objectMapper,
        ModerationAutoBanService autoBanService,
        AdminAccountBanEmailService accountBanEmailService,
        PlatformTransactionManager transactionManager
    ) {
        this.properties = properties;
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
        this.autoBanService = autoBanService;
        this.accountBanEmailService = accountBanEmailService;
        this.requiresNewTx = new TransactionTemplate(transactionManager);
        this.requiresNewTx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    /**
     * Call before making a video public. Severe caption → ban (nested tx) + ACCOUNT_BANNED.
     */
    public void assertPublishAllowed(Video video, String title, String description) {
        if (!properties.isEnabled() || video == null) {
            return;
        }
        String hit = firstSevereHit(title, description);
        if (hit == null) {
            return;
        }
        Long authorId = video.getAuthor() == null ? null : video.getAuthor().getId();
        String authorEmail = video.getAuthor() == null ? null : video.getAuthor().getEmail();
        long videoId = video.getId() == null ? 0L : video.getId();
        String reason = "Vi phạm chính sách nội dung (caption spam/tình dục): " + hit;
        log.warn("Caption gate blocked videoId={} authorId={} hit={}", videoId, authorId, hit);

        if (properties.isAutoBanOnBlock() && authorId != null) {
            requiresNewTx.executeWithoutResult(status -> {
                AdminBannedUserInfo info = autoBanService.banAuthorForModeration(
                    authorId,
                    videoId,
                    ModerationDecision.BLOCK,
                    reason
                );
                if (info != null) {
                    accountBanEmailService.sendAccountBanned(info);
                }
            });
        }
        // 403 ACCOUNT_BANNED → frontend clears session + login ban modal
        if (StringUtils.hasText(authorEmail)) {
            throw new AccountBannedException(authorEmail, reason);
        }
        throw new BadRequestException(
            "Caption/mô tả vi phạm chính sách cộng đồng (spam / nội dung tình dục). "
                + "Bài đăng bị từ chối."
        );
    }

    String firstSevereHit(String title, String description) {
        String blob = ((title == null ? "" : title) + "\n" + (description == null ? "" : description))
            .trim();
        if (!StringUtils.hasText(blob)) {
            return null;
        }
        for (Pattern pattern : loadSeverePatterns()) {
            if (pattern.matcher(blob).find()) {
                return pattern.pattern();
            }
        }
        return null;
    }

    private List<Pattern> loadSeverePatterns() {
        List<Pattern> out = new ArrayList<>(BUILTIN_SEVERE);
        try {
            List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                """
                SELECT match_json
                FROM moderation_rules
                WHERE enabled = TRUE
                  AND code = 'lex.spam'
                """
            );
            for (Map<String, Object> row : rows) {
                Object raw = row.get("match_json");
                if (raw == null) {
                    continue;
                }
                JsonNode root = objectMapper.readTree(String.valueOf(raw));
                JsonNode patterns = root.get("patterns");
                if (patterns == null || !patterns.isArray()) {
                    continue;
                }
                for (JsonNode node : patterns) {
                    String p = node.asText(null);
                    if (!StringUtils.hasText(p)) {
                        continue;
                    }
                    try {
                        out.add(Pattern.compile(p, Pattern.CASE_INSENSITIVE));
                    } catch (PatternSyntaxException ignored) {
                        // skip bad pattern
                    }
                }
            }
        } catch (Exception ex) {
            log.debug("Caption gate DB patterns unavailable: {}", ex.getMessage());
        }
        return out;
    }
}
