package com.vibely.backend.contentunderstanding.qdrant;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vibely.backend.contentunderstanding.ContentUnderstandingProperties;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Thin Qdrant HTTP client for CU video-mean vectors ({@code vibely_cu_video}).
 * Soft-fails — never throws to callers.
 */
@Component
public class CuQdrantClient {

    private static final Logger log = LoggerFactory.getLogger(CuQdrantClient.class);

    private final ContentUnderstandingProperties properties;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    public CuQdrantClient(ContentUnderstandingProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.restClient = RestClient.create();
    }

    public record Neighbor(long videoId, double score) {
    }

    /**
     * Find similar videos by CU video embedding.
     * Prefers point id = videoId (Phase 4 worker scheme); falls back to payload filter for legacy hashed ids.
     */
    public List<Neighbor> findSimilarVideoIds(long videoId, int limit) {
        if (!properties.isQdrantEnabled() || !properties.isEnabled()) {
            return List.of();
        }
        int topK = Math.max(1, Math.min(limit, properties.getQdrantTopK()));
        try {
            List<Neighbor> viaRecommend = recommendByPointId(videoId, topK);
            if (!viaRecommend.isEmpty()) {
                return viaRecommend;
            }
            List<Float> vector = resolveVectorByPayload(videoId);
            if (vector == null || vector.isEmpty()) {
                return List.of();
            }
            return searchByVector(vector, videoId, topK);
        } catch (Exception ex) {
            log.warn("CU Qdrant soft-fail videoId={}: {}", videoId, ex.toString());
            return List.of();
        }
    }

    private List<Neighbor> recommendByPointId(long videoId, int limit) {
        String url = baseUrl() + "/collections/" + properties.getQdrantVideoCollection() + "/points/recommend";
        Map<String, Object> body = new HashMap<>();
        body.put("positive", List.of(videoId));
        body.put("limit", limit + 2);
        body.put("with_payload", true);
        try {
            String raw = restClient.post()
                .uri(url)
                .body(body)
                .retrieve()
                .body(String.class);
            return parseScoredPoints(raw, videoId);
        } catch (Exception ex) {
            log.debug("Qdrant recommend by id failed videoId={}: {}", videoId, ex.getMessage());
            return List.of();
        }
    }

    private List<Float> resolveVectorByPayload(long videoId) {
        String url = baseUrl() + "/collections/" + properties.getQdrantVideoCollection() + "/points/scroll";
        Map<String, Object> filter = Map.of(
            "must",
            List.of(Map.of("key", "video_id", "match", Map.of("value", videoId)))
        );
        Map<String, Object> body = Map.of(
            "filter", filter,
            "limit", 1,
            "with_vector", true,
            "with_payload", true
        );
        try {
            String raw = restClient.post()
                .uri(url)
                .body(body)
                .retrieve()
                .body(String.class);
            JsonNode root = objectMapper.readTree(raw);
            JsonNode points = root.path("result").path("points");
            if (!points.isArray() || points.isEmpty()) {
                return null;
            }
            JsonNode vectorNode = points.get(0).path("vector");
            if (vectorNode.isArray()) {
                List<Float> vector = new ArrayList<>(vectorNode.size());
                for (JsonNode n : vectorNode) {
                    vector.add((float) n.asDouble());
                }
                return vector;
            }
            return null;
        } catch (Exception ex) {
            log.debug("Qdrant scroll by payload failed videoId={}: {}", videoId, ex.getMessage());
            return null;
        }
    }

    private List<Neighbor> searchByVector(List<Float> vector, long excludeVideoId, int limit) {
        String url = baseUrl() + "/collections/" + properties.getQdrantVideoCollection() + "/points/search";
        Map<String, Object> body = Map.of(
            "vector", vector,
            "limit", limit + 2,
            "with_payload", true
        );
        try {
            String raw = restClient.post()
                .uri(url)
                .body(body)
                .retrieve()
                .body(String.class);
            return parseScoredPoints(raw, excludeVideoId);
        } catch (Exception ex) {
            log.debug("Qdrant vector search failed: {}", ex.getMessage());
            return List.of();
        }
    }

    private List<Neighbor> parseScoredPoints(String raw, long excludeVideoId) throws java.io.IOException {
        if (raw == null || raw.isBlank()) {
            return List.of();
        }
        JsonNode root = objectMapper.readTree(raw);
        JsonNode result = root.path("result");
        if (!result.isArray()) {
            return List.of();
        }
        List<Neighbor> out = new ArrayList<>();
        for (JsonNode point : result) {
            long vid = extractVideoId(point);
            if (vid <= 0 || vid == excludeVideoId) {
                continue;
            }
            double score = point.path("score").asDouble(0);
            out.add(new Neighbor(vid, score));
        }
        return out;
    }

    private static long extractVideoId(JsonNode point) {
        JsonNode payload = point.path("payload");
        if (payload.has("video_id") && payload.get("video_id").canConvertToLong()) {
            return payload.get("video_id").asLong();
        }
        // New scheme: point id == video_id
        if (point.path("id").canConvertToLong()) {
            return point.path("id").asLong();
        }
        return -1;
    }

    private String baseUrl() {
        String url = properties.getQdrantUrl();
        if (url == null || url.isBlank()) {
            return "http://127.0.0.1:6333";
        }
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }
}
