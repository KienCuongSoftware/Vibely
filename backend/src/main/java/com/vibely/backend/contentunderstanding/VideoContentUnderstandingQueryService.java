package com.vibely.backend.contentunderstanding;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vibely.backend.common.NotFoundException;
import com.vibely.backend.user.entity.User;
import com.vibely.backend.user.repository.UserRepository;
import com.vibely.backend.video.Video;
import com.vibely.backend.video.VideoPublicIds;
import com.vibely.backend.video.VideoRepository;
import com.vibely.backend.video.VideoStatus;
import com.vibely.backend.video.service.VideoPrivacyAccessService;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class VideoContentUnderstandingQueryService {

    private final VideoRepository videoRepository;
    private final UserRepository userRepository;
    private final VideoPrivacyAccessService privacyAccessService;
    private final AnalysisJobRepository analysisJobRepository;
    private final VideoSemanticTagRepository videoSemanticTagRepository;
    private final ContentFeatureRepository contentFeatureRepository;
    private final ContentUnderstandingProperties properties;
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public VideoContentUnderstandingQueryService(
        VideoRepository videoRepository,
        UserRepository userRepository,
        VideoPrivacyAccessService privacyAccessService,
        AnalysisJobRepository analysisJobRepository,
        VideoSemanticTagRepository videoSemanticTagRepository,
        ContentFeatureRepository contentFeatureRepository,
        ContentUnderstandingProperties properties,
        JdbcTemplate jdbcTemplate,
        ObjectMapper objectMapper
    ) {
        this.videoRepository = videoRepository;
        this.userRepository = userRepository;
        this.privacyAccessService = privacyAccessService;
        this.analysisJobRepository = analysisJobRepository;
        this.videoSemanticTagRepository = videoSemanticTagRepository;
        this.contentFeatureRepository = contentFeatureRepository;
        this.properties = properties;
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public VideoAnalysisResponse getAnalysis(String publicId, Authentication authentication) {
        Video video = requireWatchable(publicId, authentication);
        AnalysisJobEntity job = analysisJobRepository.findFirstByVideo_IdOrderByCreatedAtDesc(video.getId()).orElse(null);
        List<VideoSemanticTagResponse> tags = listSemanticTags(video.getId());
        Map<String, Object> notes = new LinkedHashMap<>();
        contentFeatureRepository.findById(video.getId()).ifPresent(features -> {
            notes.put("featureVersion", features.getFeatureVersion() != null ? features.getFeatureVersion() : "cu");
            notes.put("hasContentSha", features.getContentSha256() != null);
        });
        // Modality presence via lightweight jsonb length probes
        Map<String, Object> row = jdbcTemplate.query(
            """
                SELECT feature_version,
                       (ocr <> '{}'::jsonb) AS has_ocr,
                       (visual <> '{}'::jsonb) AS has_visual,
                       (speech <> '{}'::jsonb) AS has_speech,
                       (audio <> '{}'::jsonb) AS has_audio,
                       (object_features <> '{}'::jsonb) AS has_object,
                       (scene <> '{}'::jsonb) AS has_scene
                FROM content_features WHERE video_id = ?
                """,
            rs -> {
                if (!rs.next()) {
                    return Map.of();
                }
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("featureVersion", rs.getString("feature_version"));
                m.put("ocr", rs.getBoolean("has_ocr"));
                m.put("visual", rs.getBoolean("has_visual"));
                m.put("speech", rs.getBoolean("has_speech"));
                m.put("audio", rs.getBoolean("has_audio"));
                m.put("object", rs.getBoolean("has_object"));
                m.put("scene", rs.getBoolean("has_scene"));
                return m;
            },
            video.getId()
        );
        if (row != null && !row.isEmpty()) {
            notes.putAll(row);
        }
        return new VideoAnalysisResponse(
            video.getPublicId().toString(),
            video.getId(),
            job == null ? "NONE" : job.getStatus().name(),
            String.valueOf(notes.getOrDefault("featureVersion", "cu")),
            properties.getModelBundleVersion(),
            tags.stream().limit(12).toList(),
            notes
        );
    }

    @Transactional(readOnly = true)
    public List<VideoSemanticTagResponse> getSemanticTags(String publicId, Authentication authentication) {
        Video video = requireWatchable(publicId, authentication);
        return listSemanticTags(video.getId());
    }

    @Transactional(readOnly = true)
    public List<VideoTopicSummaryResponse> getTopics(String publicId, Authentication authentication) {
        Video video = requireWatchable(publicId, authentication);
        return jdbcTemplate.query(
            """
                SELECT t.slug, t.display_name, vt.score, vt.source
                FROM video_topics vt
                JOIN topics t ON t.id = vt.topic_id
                WHERE vt.video_id = ?
                ORDER BY vt.score DESC
                """,
            (rs, i) -> new VideoTopicSummaryResponse(
                rs.getString("slug"),
                rs.getString("display_name"),
                rs.getDouble("score"),
                rs.getString("source")
            ),
            video.getId()
        );
    }

    @Transactional(readOnly = true)
    public List<VideoCategorySummaryResponse> getCategories(String publicId, Authentication authentication) {
        Video video = requireWatchable(publicId, authentication);
        Map<String, VideoCategorySummaryResponse> bySlug = new LinkedHashMap<>();
        jdbcTemplate.query(
            """
                SELECT c.slug, c.name, vc.score
                FROM video_categories vc
                JOIN categories c ON c.id = vc.category_id
                WHERE vc.video_id = ?
                ORDER BY vc.score DESC
                """,
            rs -> {
                while (rs.next()) {
                    String slug = rs.getString("slug");
                    bySlug.put(
                        slug,
                        new VideoCategorySummaryResponse(slug, rs.getString("name"), rs.getDouble("score"), "video_categories")
                    );
                }
                return null;
            },
            video.getId()
        );
        jdbcTemplate.query(
            """
                SELECT c.slug, c.name, vcs.score, vcs.source
                FROM video_category_scores vcs
                JOIN categories c ON c.id = vcs.category_id
                WHERE vcs.video_id = ?
                ORDER BY vcs.score DESC
                """,
            rs -> {
                while (rs.next()) {
                    String slug = rs.getString("slug");
                    VideoCategorySummaryResponse existing = bySlug.get(slug);
                    double score = rs.getDouble("score");
                    String source = rs.getString("source");
                    if (existing == null || score > existing.score()) {
                        bySlug.put(slug, new VideoCategorySummaryResponse(slug, rs.getString("name"), score, source));
                    }
                }
                return null;
            },
            video.getId()
        );
        return new ArrayList<>(bySlug.values());
    }

    private List<VideoSemanticTagResponse> listSemanticTags(Long videoId) {
        List<VideoSemanticTagResponse> out = new ArrayList<>();
        for (Object[] row : videoSemanticTagRepository.findTagRowsByVideoId(videoId)) {
            String slug = String.valueOf(row[1]);
            float conf = row[2] instanceof Number n ? n.floatValue() : 0.5f;
            String source = row[3] == null ? "fusion" : String.valueOf(row[3]);
            String reason = row[4] == null ? "" : String.valueOf(row[4]);
            Map<String, Object> evidence = parseEvidence(row[5]);
            String name = row[6] == null ? slug : String.valueOf(row[6]);
            String modelVersion = row[7] == null ? "" : String.valueOf(row[7]);
            out.add(new VideoSemanticTagResponse(slug, name, conf, source, reason, modelVersion, evidence));
        }
        return out;
    }

    private Video requireWatchable(String publicId, Authentication authentication) {
        UUID id = VideoPublicIds.parse(publicId);
        Video video = videoRepository.findWithAuthorByPublicId(id)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy video"));
        if (video.getStatus() != VideoStatus.READY && video.getStatus() != VideoStatus.PROCESSING) {
            User probe = null;
            if (authentication != null && authentication.getName() != null) {
                probe = userRepository.findByEmail(authentication.getName()).orElse(null);
            }
            boolean admin = probe != null && probe.getRole() != null
                && "ADMIN".equalsIgnoreCase(String.valueOf(probe.getRole()));
            if (!admin) {
                throw new NotFoundException("Không tìm thấy video");
            }
        }
        User viewer = null;
        if (authentication != null && authentication.getName() != null) {
            viewer = userRepository.findByEmail(authentication.getName()).orElse(null);
        }
        boolean admin = viewer != null && viewer.getRole() != null
            && "ADMIN".equalsIgnoreCase(String.valueOf(viewer.getRole()));
        if (!admin && !privacyAccessService.canViewerWatch(video, viewer)) {
            throw new NotFoundException("Không tìm thấy video");
        }
        return video;
    }

    private Map<String, Object> parseEvidence(Object raw) {
        if (raw == null) {
            return Map.of();
        }
        try {
            if (raw instanceof Map<?, ?> map) {
                Map<String, Object> out = new HashMap<>();
                map.forEach((k, v) -> out.put(String.valueOf(k), v));
                return out;
            }
            String json = String.valueOf(raw);
            if (json.isBlank() || "{}".equals(json)) {
                return Map.of();
            }
            return objectMapper.readValue(json, new TypeReference<>() {
            });
        } catch (Exception ignored) {
            return Map.of("raw", String.valueOf(raw));
        }
    }
}
