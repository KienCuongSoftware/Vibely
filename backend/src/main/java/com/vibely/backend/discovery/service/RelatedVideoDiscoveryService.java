package com.vibely.backend.discovery.service;

import com.vibely.backend.discovery.config.DiscoveryProperties;
import com.vibely.backend.discovery.repository.DiscoveryExploreQueryRepository;
import com.vibely.backend.discovery.repository.VideoEmbeddingRepository;
import com.vibely.backend.discovery.repository.VideoTopicRepository;
import com.vibely.backend.explore.ExploreVideoProjection;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RelatedVideoDiscoveryService {
    private final DiscoveryProperties properties;
    private final DiscoveryExploreQueryRepository discoveryExploreQueryRepository;
    private final VideoEmbeddingRepository videoEmbeddingRepository;
    private final VideoTopicRepository videoTopicRepository;
    private final EmbeddingSimilarityService embeddingSimilarityService;

    public RelatedVideoDiscoveryService(
        DiscoveryProperties properties,
        DiscoveryExploreQueryRepository discoveryExploreQueryRepository,
        VideoEmbeddingRepository videoEmbeddingRepository,
        VideoTopicRepository videoTopicRepository,
        EmbeddingSimilarityService embeddingSimilarityService
    ) {
        this.properties = properties;
        this.discoveryExploreQueryRepository = discoveryExploreQueryRepository;
        this.videoEmbeddingRepository = videoEmbeddingRepository;
        this.videoTopicRepository = videoTopicRepository;
        this.embeddingSimilarityService = embeddingSimilarityService;
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
        List<Object[]> topicScores = videoTopicRepository.findTopicScoresByVideoId(sourceId);
        if (!topicScores.isEmpty()) {
            return relatedByTopicOverlap(sourceId, topicScores, size);
        }
        return relatedByEmbedding(sourceId, size);
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
        List<Long> rankedIds = combined.entrySet().stream()
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

    private double topicOverlapScore(Long sourceId, Long candidateId, List<Object[]> sourceTopics) {
        List<Object[]> candidateTopics = videoTopicRepository.findTopicScoresByVideoId(candidateId);
        if (candidateTopics.isEmpty()) {
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
}
