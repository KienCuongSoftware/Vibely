package com.vibely.backend.moderation;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vibely.backend.video.Video;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class ModerationSnapshotBuilder {

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    private final CreatorTrustService trustService;

    public ModerationSnapshotBuilder(
        JdbcTemplate jdbcTemplate,
        ObjectMapper objectMapper,
        CreatorTrustService trustService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
        this.trustService = trustService;
    }

    public Map<String, Object> build(
        Video video,
        UUID analysisJobId,
        Long originalityReportId,
        boolean originalityPending
    ) {
        Map<String, Object> snap = new LinkedHashMap<>();
        snap.put("video_id", video.getId());
        snap.put("video_public_id", video.getPublicId() == null ? null : video.getPublicId().toString());
        snap.put("title", nullToEmpty(video.getTitle()));
        snap.put("description", nullToEmpty(video.getDescription()));
        Long authorId = video.getAuthor() == null ? null : video.getAuthor().getId();
        snap.put("author_id", authorId);
        snap.put("analysis_job_id", analysisJobId == null ? null : analysisJobId.toString());
        snap.put("originality_report_id", originalityReportId);
        snap.put("originality_pending", originalityPending);
        snap.put("trust_score", trustService.getTrustScore(authorId));

        Map<String, Object> features = loadContentFeatures(video.getId());
        snap.put("content_sha256", features.get("content_sha256"));
        snap.put("ocr_text", features.get("ocr_text"));
        snap.put("speech_text", features.get("speech_text"));
        snap.put("object_labels", features.get("object_labels"));
        snap.put("scene_labels", features.get("scene_labels"));
        snap.put("visual_features", features.get("visual_features"));
        snap.put("object_features", features.get("object_features"));
        snap.put("tags", loadTags(video.getId()));
        snap.put("originality", loadOriginality(video.getId(), originalityReportId));
        snap.put("open_report", video.getReportReason() != null && !video.getReportReason().isBlank());
        return snap;
    }

    /**
     * Refresh CU visual/object blobs at claim time so detector plugins see
     * latest stored features even for jobs snapshotted before Phase 4.
     */
    public Map<String, Object> enrichForPlugins(long videoId, Map<String, Object> snapshot) {
        Map<String, Object> snap = snapshot == null ? new LinkedHashMap<>() : new LinkedHashMap<>(snapshot);
        Map<String, Object> features = loadContentFeatures(videoId);
        snap.put("visual_features", features.get("visual_features"));
        snap.put("object_features", features.get("object_features"));
        if (snap.get("object_labels") == null) {
            snap.put("object_labels", features.get("object_labels"));
        }
        if (snap.get("scene_labels") == null) {
            snap.put("scene_labels", features.get("scene_labels"));
        }
        if (snap.get("tags") == null) {
            snap.put("tags", loadTags(videoId));
        }
        return snap;
    }

    public String toJson(Map<String, Object> snap) {
        try {
            return objectMapper.writeValueAsString(snap);
        } catch (JsonProcessingException e) {
            return "{}";
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> loadContentFeatures(Long videoId) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
            """
            SELECT content_sha256, ocr, speech, visual, object_features, scene
            FROM content_features WHERE video_id = ?
            """,
            videoId
        );
        Map<String, Object> out = new HashMap<>();
        out.put("content_sha256", null);
        out.put("ocr_text", "");
        out.put("speech_text", "");
        out.put("object_labels", List.of());
        out.put("scene_labels", List.of());
        out.put("visual_features", Map.of());
        out.put("object_features", Map.of());
        if (rows.isEmpty()) {
            return out;
        }
        Map<String, Object> row = rows.get(0);
        out.put("content_sha256", row.get("content_sha256"));
        out.put("ocr_text", extractText(row.get("ocr"), List.of("text", "full_text", "combined")));
        out.put("speech_text", extractText(row.get("speech"), List.of("text", "transcript", "full_text")));
        out.put("object_labels", extractLabels(row.get("object_features")));
        out.put("scene_labels", extractLabels(row.get("scene")));
        out.put("visual_features", sanitizeVisual(asMap(row.get("visual"))));
        out.put("object_features", sanitizeObjectFeatures(asMap(row.get("object_features"))));
        return out;
    }

    /** Drop bulky per-frame payloads; plugins only need aggregates. */
    private Map<String, Object> sanitizeVisual(Map<String, Object> visual) {
        if (visual == null || visual.isEmpty()) {
            return Map.of();
        }
        Map<String, Object> out = new LinkedHashMap<>();
        for (String key : List.of(
            "modelId", "note", "frameCount", "tagScores", "qdrant", "topTags", "visualTags"
        )) {
            if (visual.containsKey(key)) {
                out.put(key, visual.get(key));
            }
        }
        Object nested = visual.get("visualFeatures");
        if (nested instanceof Map<?, ?> m) {
            Map<String, Object> vf = new LinkedHashMap<>();
            m.forEach((k, v) -> {
                String ks = String.valueOf(k);
                if (!"frameVectors".equals(ks) && !"vectors".equals(ks)) {
                    vf.put(ks, v);
                }
            });
            out.put("visualFeatures", vf);
            if (!out.containsKey("tagScores") && vf.get("tagScores") != null) {
                out.put("tagScores", vf.get("tagScores"));
            }
            if (!out.containsKey("modelId") && vf.get("modelId") != null) {
                out.put("modelId", vf.get("modelId"));
            }
            if (!out.containsKey("frameCount") && vf.get("frameCount") != null) {
                out.put("frameCount", vf.get("frameCount"));
            }
        }
        return out;
    }

    private Map<String, Object> sanitizeObjectFeatures(Map<String, Object> objects) {
        if (objects == null || objects.isEmpty()) {
            return Map.of();
        }
        Map<String, Object> out = new LinkedHashMap<>();
        for (String key : List.of(
            "engine", "modelId", "note", "frameCount", "classCounts", "classMaxConf", "personDetections"
        )) {
            if (objects.containsKey(key)) {
                out.put(key, objects.get(key));
            }
        }
        return out;
    }

    private List<Map<String, Object>> loadTags(Long videoId) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
            """
            SELECT st.slug, vst.confidence, vst.source
            FROM video_semantic_tags vst
            JOIN semantic_tags st ON st.id = vst.tag_id
            WHERE vst.video_id = ?
            ORDER BY vst.confidence DESC
            LIMIT 64
            """,
            videoId
        );
        List<Map<String, Object>> tags = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            Map<String, Object> t = new LinkedHashMap<>();
            t.put("slug", row.get("slug"));
            t.put("confidence", row.get("confidence"));
            t.put("source", row.get("source"));
            tags.add(t);
        }
        return tags;
    }

    private Map<String, Object> loadOriginality(Long videoId, Long reportId) {
        Map<String, Object> empty = new LinkedHashMap<>();
        empty.put("present", false);
        List<Map<String, Object>> rows;
        if (reportId != null) {
            rows = jdbcTemplate.queryForList(
                """
                SELECT id, decision, risk_level, overall_confidence, originality_score, explain_json
                FROM originality_reports WHERE id = ?
                """,
                reportId
            );
        } else {
            rows = jdbcTemplate.queryForList(
                """
                SELECT id, decision, risk_level, overall_confidence, originality_score, explain_json
                FROM originality_reports WHERE video_id = ?
                """,
                videoId
            );
        }
        if (rows.isEmpty()) {
            return empty;
        }
        Map<String, Object> row = rows.get(0);
        Map<String, Object> o = new LinkedHashMap<>();
        o.put("present", true);
        o.put("id", row.get("id"));
        o.put("decision", row.get("decision"));
        o.put("risk_level", row.get("risk_level"));
        o.put("overall_confidence", row.get("overall_confidence"));
        o.put("originality_score", row.get("originality_score"));
        return o;
    }

    private String extractText(Object jsonCol, List<String> keys) {
        Map<String, Object> map = asMap(jsonCol);
        if (map.isEmpty()) {
            return "";
        }
        for (String key : keys) {
            Object v = map.get(key);
            if (v instanceof String s && !s.isBlank()) {
                return s;
            }
        }
        Object blocks = map.get("blocks");
        if (blocks instanceof List<?> list) {
            StringBuilder sb = new StringBuilder();
            for (Object item : list) {
                if (item instanceof Map<?, ?> m) {
                    Object t = m.get("text");
                    if (t != null) {
                        if (!sb.isEmpty()) {
                            sb.append(' ');
                        }
                        sb.append(t);
                    }
                }
            }
            return sb.toString();
        }
        return "";
    }

    private List<String> extractLabels(Object jsonCol) {
        Map<String, Object> map = asMap(jsonCol);
        List<String> labels = new ArrayList<>();
        Object raw = map.get("labels");
        if (raw == null) {
            raw = map.get("classes");
        }
        if (raw == null) {
            raw = map.get("objects");
        }
        if (raw instanceof List<?> list) {
            for (Object item : list) {
                if (item instanceof String s) {
                    labels.add(s);
                } else if (item instanceof Map<?, ?> m) {
                    Object name = m.get("label");
                    if (name == null) {
                        name = m.get("class");
                    }
                    if (name == null) {
                        name = m.get("name");
                    }
                    if (name != null) {
                        labels.add(String.valueOf(name));
                    }
                }
            }
        }
        return labels;
    }

    private Map<String, Object> asMap(Object jsonCol) {
        if (jsonCol == null) {
            return Map.of();
        }
        try {
            if (jsonCol instanceof Map<?, ?> m) {
                Map<String, Object> out = new HashMap<>();
                m.forEach((k, v) -> out.put(String.valueOf(k), v));
                return out;
            }
            String raw = String.valueOf(jsonCol);
            if (raw.isBlank() || "{}".equals(raw)) {
                return Map.of();
            }
            return objectMapper.readValue(raw, new TypeReference<>() {});
        } catch (Exception e) {
            return Map.of();
        }
    }

    private static String nullToEmpty(String s) {
        return s == null ? "" : s;
    }
}
