package com.vibely.backend.discovery.service;

import com.vibely.backend.discovery.model.UserTopicInterest;
import com.vibely.backend.discovery.repository.DiscoveryExploreQueryRepository;
import com.vibely.backend.discovery.repository.UserTopicInterestRepository;
import com.vibely.backend.discovery.repository.VideoTopicRepository;
import com.vibely.backend.explore.ExploreVideoProjection;
import com.vibely.backend.interaction.FollowRepository;
import com.vibely.backend.video.VideoRepository;
import com.vibely.backend.video.VideoStatus;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RecommendationService {
    private final UserTopicInterestRepository userTopicInterestRepository;
    private final VideoTopicRepository videoTopicRepository;
    private final DiscoveryExploreQueryRepository discoveryExploreQueryRepository;
    private final VideoRepository videoRepository;
    private final FollowRepository followRepository;
    private final ForYouRankingService forYouRankingService;

    public RecommendationService(
        UserTopicInterestRepository userTopicInterestRepository,
        VideoTopicRepository videoTopicRepository,
        DiscoveryExploreQueryRepository discoveryExploreQueryRepository,
        VideoRepository videoRepository,
        FollowRepository followRepository,
        ForYouRankingService forYouRankingService
    ) {
        this.userTopicInterestRepository = userTopicInterestRepository;
        this.videoTopicRepository = videoTopicRepository;
        this.discoveryExploreQueryRepository = discoveryExploreQueryRepository;
        this.videoRepository = videoRepository;
        this.followRepository = followRepository;
        this.forYouRankingService = forYouRankingService;
    }

    @Transactional(readOnly = true)
    public List<Long> forYouVideoIds(Long userId, int size) {
        int req = Math.max(1, Math.min(size, 50));
        Set<Long> candidateIds = new LinkedHashSet<>();
        if (userId != null) {
            List<UserTopicInterest> interests = userTopicInterestRepository.findTopByUserId(userId, PageRequest.of(0, 12));
            for (UserTopicInterest interest : interests) {
                candidateIds.addAll(videoTopicRepository.findRelatedVideoIdsByTopicsForTopic(
                    interest.getTopic().getId(),
                    req * 3
                ));
            }
            followRepository.findFollowingIds(userId).stream()
                .flatMap(creatorId -> videoRepository.findTopIdsByAuthorAndStatus(
                    creatorId, VideoStatus.READY, PageRequest.of(0, 10)
                ).stream())
                .forEach(candidateIds::add);
        }
        candidateIds.addAll(videoRepository.findTopRankingVideoIds(VideoStatus.READY, PageRequest.of(0, req * 4)));
        List<Long> ids = new ArrayList<>(candidateIds);
        if (ids.isEmpty()) {
            return discoveryExploreQueryRepository.findTrendingHybrid(null, null, null, PageRequest.of(0, req))
                .stream()
                .map(ExploreVideoProjection::getId)
                .toList();
        }
        Map<Long, Double> personalized = scoreCandidates(userId, ids);
        return personalized.entrySet().stream()
            .sorted(Map.Entry.<Long, Double>comparingByValue().reversed())
            .limit(req)
            .map(Map.Entry::getKey)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<ExploreVideoProjection> forYouFeed(Long userId, int size) {
        List<Long> ids = forYouVideoIds(userId, size);
        if (ids.isEmpty()) {
            return List.of();
        }
        return discoveryExploreQueryRepository.findByVideoIds(ids).stream()
            .sorted(Comparator.comparingInt(v -> ids.indexOf(v.getId())))
            .toList();
    }

    private Map<Long, Double> scoreCandidates(Long userId, List<Long> candidateIds) {
        Map<Long, Double> scores = new HashMap<>();
        Map<Long, Double> userTopicScores = new HashMap<>();
        if (userId != null) {
            for (UserTopicInterest interest : userTopicInterestRepository.findTopByUserId(userId, PageRequest.of(0, 20))) {
                userTopicScores.put(interest.getTopic().getId(), interest.getScore());
            }
        }
        for (Long videoId : candidateIds) {
            double topicAffinity = 0;
            for (Object[] row : videoTopicRepository.findTopicScoresByVideoId(videoId)) {
                Long topicId = ((Number) row[0]).longValue();
                double topicScore = ((Number) row[1]).doubleValue();
                topicAffinity += userTopicScores.getOrDefault(topicId, 0.0) * topicScore;
            }
            double ranking = forYouRankingService.scoreVideoId(videoId);
            scores.put(videoId, topicAffinity * 0.55 + ranking * 0.45);
        }
        return scores;
    }
}
