package com.vibely.backend.discovery.service;

import com.vibely.backend.contentunderstanding.VideoSemanticTagRepository;
import com.vibely.backend.contentunderstanding.qdrant.CuQdrantClient;
import com.vibely.backend.discovery.config.DiscoveryProperties;
import com.vibely.backend.discovery.repository.DiscoveryExploreQueryRepository;
import com.vibely.backend.discovery.repository.VideoEmbeddingRepository;
import com.vibely.backend.discovery.repository.VideoTopicRepository;
import com.vibely.backend.explore.ExploreVideoProjection;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RelatedVideoDiscoveryService {
    private static final double W_QDRANT = 0.55;
    private static final double W_TAG = 0.25;
    private static final double W_TOPIC = 0.20;

    private final DiscoveryProperties properties;
    private final DiscoveryExploreQueryRepository discoveryExploreQueryRepository;
    private final VideoEmbeddingRepository videoEmbeddingRepository;
    private final VideoTopicRepository videoTopicRepository;
    private final EmbeddingSimilarityService embeddingSimilarityService;
    private final CuQdrantClient cuQdrantClient;
    private final VideoSemanticTagRepository videoSemanticTagRepository;

    public RelatedVideoDiscoveryService(
        DiscoveryProperties properties,
        DiscoveryExploreQueryRepository discoveryExploreQueryRepository,
        VideoEmbeddingRepository videoEmbeddingRepository,
        VideoTopicRepository videoTopicRepository,
        EmbeddingSimilarityService embeddingSimilarityService,
        CuQdrantClient cuQdrantClient,
        VideoSemanticTagRepository videoSemanticTagRepository
    ) {
        this.properties = properties;
        this.discoveryExploreQueryRepository = discoveryExploreQueryRepository;
        this.videoEmbeddingRepository = videoEmbeddingRepository;
        this.videoTopicRepository = videoTopicRepository;
        this.embeddingSimilarityService = embeddingSimilarityService;
        this.cuQdrantClient = cuQdrantClient;
        this.videoSemanticTagRepository = videoSemanticTagRepository;
    }

    @Transactional(readOnly = true)
    public List<ExploreVideoProjection> related(UUID publicId, int size) {
        if (!properties.isEnabled() || !properties.isHybridRelated()) {
            return List.of();
        }
        Long sourceId = discoveryExploreQueryRepository.findVideoIdByPublicId(publicId);
        if (sourceId == null) {
            return List.of();
        }
        if (properties.isCuRelatedEnabled()) {
            List<ExploreVideoProjection> cuHybrid = relatedByCuHybrid(sourceId, size);
            if (!cuHybrid.isEmpty()) {
                return cuHybrid;
            }
        }
        List<Object[]> topicScores = videoTopicRepository.findTopicScoresByVideoId(sourceId);
        if (!topicScores.isEmpty()) {
            return relatedByTopicOverlap(sourceId, topicScores, size);
        }
        return relatedByEmbedding(sourceId, size);
    }

    private List<ExploreVideoProjection> relatedByCuHybrid(Long sourceId, int size) {
        Set<String> sourceTags = loadTagSlugs(sourceId);
        List<Object[]> sourceTopics = videoTopicRepository.findTopicScoresByVideoId(sourceId);

        Map<Long, Double> qdrantScores = new HashMap<>();
        for (CuQdrantClient.Neighbor n : cuQdrantClient.findSimilarVideoIds(sourceId, size * 6)) {
            qdrantScores.put(n.videoId(), clamp01(n.score()));
        }

        Set<Long> candidateIds = new LinkedHashSet<>(qdrantScores.keySet());
        if (!sourceTags.isEmpty()) {
            candidateIds.addAll(videoSemanticTagRepository.findVideoIdsByTagSlugs(sourceTags, sourceId, size * 6));
        }
        candidateIds.addAll(videoTopicRepository.findRelatedVideoIdsByTopics(sourceId, size * 6));
        candidateIds.remove(sourceId);
        if (candidateIds.isEmpty()) {
            return List.of();
        }

        Map<Long, Set<String>> candidateTags = loadTagSlugsForVideos(candidateIds);
        Map<Long, Double> ranked = new HashMap<>();
        for (Long candidateId : candidateIds) {
            double q = qdrantScores.getOrDefault(candidateId, 0.0);
            double tag = jaccard(sourceTags, candidateTags.getOrDefault(candidateId, Set.of()));
            double topic = topicOverlapScore(sourceId, candidateId, sourceTopics);
            double score = W_QDRANT * q + W_TAG * tag + W_TOPIC * topic;
            if (score > 0.02) {
                ranked.put(candidateId, score);
            }
        }
        return mapRanked(ranked, size);
    }

    private List<ExploreVideoProjection> relatedByTopicOverlap(Long sourceId, List<Object[]> sourceTopics, int size) {
        List<Long> candidateIds = videoTopicRepository.findRelatedVideoIdsByTopics(sourceId, size * 6);
        Map<Long, Double> ranked = new LinkedHashMap<>();
        for (Long candidateId : candidateIds) {
            double overlap = topicOverlapScore(sourceId, candidateId, sourceTopics);
            if (overlap > 0) {
                ranked.put(candidateId, overlap);
            }
        }
        return mapRanked(ranked, size);
    }

    private List<ExploreVideoProjection> relatedByEmbedding(Long sourceId, int size) {
        var sourceEmbedding = videoEmbeddingRepository.findByVideoId(sourceId);
        if (sourceEmbedding.isEmpty()) {
            return List.of();
        }
        Map<Long, Double> combined = new HashMap<>();
        List<Object[]> candidates = videoEmbeddingRepository.findCandidateEmbeddings(sourceId, size * 8);
        for (Object[] row : candidates) {
            Long candidateId = ((Number) row[0]).longValue();
            String json = (String) row[1];
            double embeddingSim = embeddingSimilarityService.cosineSimilarity(
                sourceEmbedding.get().getEmbeddingJson(),
                json
            );
            combined.put(candidateId, Math.max(combined.getOrDefault(candidateId, 0.0), embeddingSim));
        }
        return mapRanked(combined, size);
    }

    private List<ExploreVideoProjection> mapRanked(Map<Long, Double> ranked, int size) {
        List<Long> rankedIds = ranked.entrySet().stream()
            .sorted(Map.Entry.<Long, Double>comparingByValue().reversed())
            .limit(size + 1)
            .map(Map.Entry::getKey)
            .toList();
        if (rankedIds.isEmpty()) {
            return List.of();
        }
        return discoveryExploreQueryRepository.findByVideoIds(new ArrayList<>(rankedIds)).stream()
            .sorted(Comparator.comparingInt(v -> rankedIds.indexOf(v.getId())))
            .limit(size + 1)
            .toList();
    }

    private Set<String> loadTagSlugs(Long videoId) {
        List<Object[]> rows = videoSemanticTagRepository.findTagRowsByVideoId(videoId);
        Set<String> slugs = new HashSet<>();
        for (Object[] row : rows) {
            if (row[1] != null) {
                slugs.add(String.valueOf(row[1]).toLowerCase());
            }
        }
        return slugs;
    }

    private Map<Long, Set<String>> loadTagSlugsForVideos(Set<Long> videoIds) {
        if (videoIds.isEmpty()) {
            return Map.of();
        }
        Map<Long, Set<String>> out = new HashMap<>();
        for (Object[] row : videoSemanticTagRepository.findSlugsByVideoIds(videoIds)) {
            Long vid = ((Number) row[0]).longValue();
            String slug = row[1] == null ? null : String.valueOf(row[1]).toLowerCase();
            if (slug == null || slug.isBlank()) {
                continue;
            }
            out.computeIfAbsent(vid, ignored -> new HashSet<>()).add(slug);
        }
        return out;
    }

    private static double jaccard(Set<String> a, Set<String> b) {
        if (a.isEmpty() || b.isEmpty()) {
            return 0;
        }
        int intersection = 0;
        for (String s : a) {
            if (b.contains(s)) {
                intersection++;
            }
        }
        int union = a.size() + b.size() - intersection;
        return union == 0 ? 0 : (double) intersection / union;
    }

    private double topicOverlapScore(Long sourceId, Long candidateId, List<Object[]> sourceTopics) {
        List<Object[]> candidateTopics = videoTopicRepository.findTopicScoresByVideoId(candidateId);
        if (candidateTopics.isEmpty() || sourceTopics == null || sourceTopics.isEmpty()) {
            return 0;
        }
        Map<Long, Double> sourceMap = toMap(sourceTopics);
        double sum = 0;
        for (Object[] row : candidateTopics) {
            Long topicId = ((Number) row[0]).longValue();
            double score = ((Number) row[1]).doubleValue();
            Double sourceScore = sourceMap.get(topicId);
            if (sourceScore != null) {
                sum += Math.min(sourceScore, score);
            }
        }
        return Math.min(1.0, sum);
    }

    private static Map<Long, Double> toMap(List<Object[]> rows) {
        Map<Long, Double> map = new HashMap<>();
        for (Object[] row : rows) {
            map.put(((Number) row[0]).longValue(), ((Number) row[1]).doubleValue());
        }
        return map;
    }

    private static double clamp01(double v) {
        if (v < 0) {
            return 0;
        }
        if (v > 1) {
            return 1;
        }
        return v;
    }
}
