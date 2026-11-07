package com.vibely.backend.subtitle;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * Persist Whisper timed segments from CU {@code speechFeatures} into subtitle tracks.
 */
@Service
public class VideoSubtitlePersistService {

    private static final Logger log = LoggerFactory.getLogger(VideoSubtitlePersistService.class);

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public VideoSubtitlePersistService(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public void persistFromSpeechFeatures(Long videoId, Map<String, Object> speechFeatures) {
        if (videoId == null || speechFeatures == null || speechFeatures.isEmpty()) {
            return;
        }
        try {
            JsonNode root = objectMapper.valueToTree(speechFeatures);
            persistFromSpeechNode(videoId, root);
        } catch (Exception ex) {
            log.warn("Failed to persist subtitle cues videoId={}: {}", videoId, ex.getMessage());
        }
    }

    /** Backfill from existing {@code content_features.speech} JSON for older videos. */
    @Transactional
    public boolean backfillFromContentFeaturesIfNeeded(Long videoId) {
        if (videoId == null) {
            return false;
        }
        Integer count = jdbcTemplate.query(
            "SELECT COUNT(*) FROM video_subtitle_tracks WHERE video_id = ? AND source = 'asr'",
            rs -> rs.next() ? rs.getInt(1) : 0,
            videoId
        );
        if (count != null && count > 0) {
            return false;
        }
        String speechJson = jdbcTemplate.query(
            "SELECT speech::text FROM content_features WHERE video_id = ?",
            rs -> rs.next() ? rs.getString(1) : null,
            videoId
        );
        if (!StringUtils.hasText(speechJson)) {
            return false;
        }
        try {
            JsonNode root = objectMapper.readTree(speechJson);
            return persistFromSpeechNode(videoId, root);
        } catch (Exception ex) {
            log.warn("Subtitle backfill failed videoId={}: {}", videoId, ex.getMessage());
            return false;
        }
    }

    private boolean persistFromSpeechNode(Long videoId, JsonNode root) {
        List<SubtitleCueDto> cues = parseSegments(root.path("segments"));
        if (cues.isEmpty()) {
            return false;
        }
        String lang = SubtitleLangNormalizer.normalize(textOrNull(root.path("language")));
        if (!StringUtils.hasText(lang)) {
            lang = "und";
        }
        String model = textOrNull(root.path("modelId"));
        upsertAsrTrack(videoId, lang, model, cues);
        log.info("Persisted ASR subtitle track videoId={} lang={} cues={}", videoId, lang, cues.size());
        return true;
    }

    private void upsertAsrTrack(Long videoId, String lang, String model, List<SubtitleCueDto> cues) {
        Long existingId = jdbcTemplate.query(
            """
                SELECT id FROM video_subtitle_tracks
                WHERE video_id = ? AND lang = ?
                LIMIT 1
                """,
            rs -> rs.next() ? rs.getLong(1) : null,
            videoId,
            lang
        );

        long trackId;
        if (existingId != null) {
            trackId = existingId;
            jdbcTemplate.update("DELETE FROM video_subtitle_cues WHERE track_id = ?", trackId);
            jdbcTemplate.update(
                """
                    UPDATE video_subtitle_tracks
                    SET source = 'asr', status = 'READY', model = ?, cue_count = ?,
                        source_track_id = NULL, updated_at = NOW()
                    WHERE id = ?
                    """,
                model,
                cues.size(),
                trackId
            );
        } else {
            trackId = jdbcTemplate.queryForObject(
                """
                    INSERT INTO video_subtitle_tracks
                        (video_id, lang, source, status, model, cue_count, created_at, updated_at)
                    VALUES (?, ?, 'asr', 'READY', ?, ?, NOW(), NOW())
                    RETURNING id
                    """,
                Long.class,
                videoId,
                lang,
                model,
                cues.size()
            );
        }

        int ordinal = 0;
        for (SubtitleCueDto cue : cues) {
            jdbcTemplate.update(
                """
                    INSERT INTO video_subtitle_cues (track_id, start_ms, end_ms, text, ordinal)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                trackId,
                cue.startMs(),
                cue.endMs(),
                cue.text(),
                ordinal++
            );
        }
    }

    private static List<SubtitleCueDto> parseSegments(JsonNode segments) {
        List<SubtitleCueDto> out = new ArrayList<>();
        if (segments == null || !segments.isArray()) {
            return out;
        }
        for (Iterator<JsonNode> it = segments.elements(); it.hasNext(); ) {
            JsonNode seg = it.next();
            String text = textOrNull(seg.path("text"));
            if (!StringUtils.hasText(text)) {
                continue;
            }
            int start = seg.path("startMs").asInt(0);
            int end = seg.path("endMs").asInt(start);
            if (end < start) {
                end = start;
            }
            out.add(new SubtitleCueDto(start, end, text.trim()));
        }
        return out;
    }

    private static String textOrNull(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return null;
        }
        String v = node.asText(null);
        return StringUtils.hasText(v) ? v.trim() : null;
    }
}
