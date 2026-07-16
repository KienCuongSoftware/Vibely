package com.vibely.backend.moderation;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vibely.backend.admin.AdminAccountBanEmailService;
import com.vibely.backend.admin.AdminBannedUserInfo;
import com.vibely.backend.auth.exception.AccountBannedException;
import com.vibely.backend.common.BadRequestException;
import com.vibely.backend.video.Video;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;
import java.util.regex.PatternSyntaxException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * Sync caption gate so spam / sexual / violence bait cannot go live while waiting for
 * async CU visual moderation. Only the user-written caption ({@code description}) is
 * scanned — never the upload filename / auto title. Visual NSFW/violence is handled by CU.
 */
@Service
public class ModerationCaptionGateService {

    private static final Logger log = LoggerFactory.getLogger(ModerationCaptionGateService.class);

    /** Always-on patterns (independent of DB / V70 apply state). */
    private static final int RE_FLAGS = Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE;

    /**
     * Compact fallbacks if DB lex not loaded yet. Full lists live in Flyway
     * {@code lex.sexual_vi} / {@code lex.violence_vi} (V72–V74) and are loaded via JDBC.
     */
    private static final List<Pattern> BUILTIN_SEVERE = List.of(
        Pattern.compile(
            "follow\\s*(?:for|of|4)\\s*nudes?|free\\s*nudes?|send\\s*nudes|only\\s*fans|pornhub|"
                + "\\bfuck(?:ing)?\\b|\\bcunt\\b|\\bpussy\\b|\\bdick\\b|\\bwhore\\b|\\bslut\\b|"
                + "đầu\\s*buồi|dau\\s*buoi|buồi|\\bbuoi\\b|cặc|\\bcak\\b|lồn|\\bloz\\b|"
                + "địt|đụ|chịch|đéo|con\\s*đĩ|đĩ\\b|điếm|bú\\s*cu|làm\\s*tình|ảnh\\s*nóng|clip\\s*sex|"
                + "tinh[\\s_\\-]*duc|tình[\\s_\\-]*dục|quan[\\s_\\-]*he[\\s_\\-]*tinh[\\s_\\-]*duc",
            RE_FLAGS
        ),
        Pattern.compile(
            "giết\\s*người|giet\\s*nguoi|giết\\s*chết|ám\\s*sát|am\\s*sat|thảm\\s*sát|"
                + "khủng\\s*bố|khung\\s*bo|đặt\\s*bom|xả\\s*súng|bắn\\s*chết|chém\\s*giết|"
                + "hiếp\\s*dâm|cưỡng\\s*hiếp|\\bkill\\s+(you|people|him|her|them)\\b|"
                + "school\\s*shooting|terror\\s*attack|\\bmurder\\b|\\bgore\\b|behead",
            RE_FLAGS
        )
    );

    private final ModerationProperties properties;
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    private final ModerationAutoBanService autoBanService;
    private final AdminAccountBanEmailService accountBanEmailService;

    public ModerationCaptionGateService(
        ModerationProperties properties,
        JdbcTemplate jdbcTemplate,
        ObjectMapper objectMapper,
        ModerationAutoBanService autoBanService,
        AdminAccountBanEmailService accountBanEmailService
    ) {
        this.properties = properties;
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
        this.autoBanService = autoBanService;
        this.accountBanEmailService = accountBanEmailService;
    }

    /**
     * Call before making a video public. Severe caption → ban (own tx) + ACCOUNT_BANNED.
     * Always runs for severe builtins (not gated by {@code vibely.moderation.enabled} / apply-decisions).
     */
    public void assertPublishAllowed(Video video, String title, String description) {
        if (video == null) {
            return;
        }
        Long authorId = video.getAuthor() == null ? null : video.getAuthor().getId();
        String authorEmail = video.getAuthor() == null ? null : video.getAuthor().getEmail();
        long videoId = video.getId() == null ? 0L : video.getId();
        assertPublishAllowed(authorId, authorEmail, videoId, title, description);
    }

    /**
     * Prefer this overload when calling outside a write transaction (detached author ids).
     */
    public void assertPublishAllowed(
        Long authorId,
        String authorEmail,
        long videoId,
        String title,
        String description
    ) {
        // Caption only — ignore title / filename (visual CU covers frame content).
        String hit = firstSevereHit(description);
        if (hit == null) {
            return;
        }
        // User/admin-facing reason — never store regex patterns in ban_reason.
        String reason = BanReasonFormatter.forCaptionViolation(description);
        log.warn("Caption gate blocked videoId={} authorId={} hit={}", videoId, authorId, hit);

        if (properties.isAutoBanOnBlock() && authorId != null) {
            AdminBannedUserInfo info = autoBanService.banAuthorForModeration(
                authorId,
                videoId,
                ModerationDecision.BLOCK,
                reason
            );
            // Email after ban tx commits — never roll back the ban if SMTP fails.
            if (info != null) {
                try {
                    accountBanEmailService.sendAccountBanned(info);
                } catch (Exception ex) {
                    log.warn("Ban email failed after caption gate: {}", ex.getMessage());
                }
            }
        }
        // 403 ACCOUNT_BANNED → frontend clears session + login ban modal
        if (StringUtils.hasText(authorEmail)) {
            throw new AccountBannedException(authorEmail, reason);
        }
        throw new BadRequestException(
            "Caption/mô tả vi phạm chính sách cộng đồng (spam / nội dung tình dục / bạo lực). "
                + "Bài đăng bị từ chối."
        );
    }

    /**
     * Scan caption text only (Studio mô tả). Title / filename are ignored.
     */
    String firstSevereHit(String description) {
        String raw = description == null ? "" : description.trim();
        if (!StringUtils.hasText(raw)) {
            return null;
        }
        String normalized = normalizeForMatch(raw);
        List<Pattern> patterns = loadSeverePatterns();
        for (Pattern pattern : patterns) {
            if (pattern.matcher(raw).find() || pattern.matcher(normalized).find()) {
                return pattern.pattern();
            }
        }
        return null;
    }

    /**
     * Lowercase, map separators to spaces, strip Vietnamese diacritics — so caption
     * obfuscations like {@code tinh_duc} still match.
     */
    static String normalizeForMatch(String text) {
        if (text == null || text.isBlank()) {
            return "";
        }
        String spaced = text.replaceAll("[_\\-./]+", " ");
        String nfd = Normalizer.normalize(spaced, Normalizer.Form.NFD);
        String noMarks = nfd.replaceAll("\\p{M}+", "");
        return noMarks.toLowerCase(Locale.ROOT).replaceAll("\\s+", " ").trim();
    }

    private List<Pattern> loadSeverePatterns() {
        List<Pattern> out = new ArrayList<>(BUILTIN_SEVERE);
        try {
            List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                """
                SELECT match_json
                FROM moderation_rules
                WHERE enabled = TRUE
                  AND code LIKE 'lex.%'
                  AND UPPER(COALESCE(action_hint, '')) IN ('BLOCK', 'DELETE')
                  AND COALESCE(match_json->>'type', '') = 'lexicon'
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
                        out.add(Pattern.compile(
                            p,
                            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
                        ));
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
