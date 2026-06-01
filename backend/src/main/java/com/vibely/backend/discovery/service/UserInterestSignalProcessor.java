package com.vibely.backend.discovery.service;

import com.vibely.backend.discovery.config.DiscoveryProperties;
import com.vibely.backend.discovery.model.UserTopicInterest;
import com.vibely.backend.discovery.model.VideoTopic;
import com.vibely.backend.discovery.repository.UserTopicInterestRepository;
import com.vibely.backend.discovery.repository.VideoTopicRepository;
import com.vibely.backend.user.User;
import com.vibely.backend.user.UserRepository;
import com.vibely.backend.video.Video;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserInterestSignalProcessor {
    private static final double DECAY = 0.94;
    private static final double MIN_SCORE = 0.0;
    private static final double MAX_SCORE = 1.0;

    private final DiscoveryProperties properties;
    private final UserTopicInterestRepository userTopicInterestRepository;
    private final VideoTopicRepository videoTopicRepository;
    private final UserRepository userRepository;

    public UserInterestSignalProcessor(
        DiscoveryProperties properties,
        UserTopicInterestRepository userTopicInterestRepository,
        VideoTopicRepository videoTopicRepository,
        UserRepository userRepository
    ) {
        this.properties = properties;
        this.userTopicInterestRepository = userTopicInterestRepository;
        this.videoTopicRepository = videoTopicRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public void onView(Long userId, Video video, long watchedMs, Long durationMs) {
        if (userId == null || video == null) {
            return;
        }
        double completion = completionRate(watchedMs, durationMs);
        var weights = properties.getInterest();
        if (completion >= 0.95) {
            applyVideoTopics(userId, video.getId(), weights.getHighCompletionBoost(), completion);
        } else if (completion >= 0.70) {
            applyVideoTopics(userId, video.getId(), weights.getMediumCompletionBoost(), completion);
        } else if (completion >= 0.30) {
            applyVideoTopics(userId, video.getId(), weights.getLowCompletionBoost(), completion);
        } else if (completion < 0.15) {
            applyVideoTopics(userId, video.getId(), -weights.getSkipPenalty(), completion);
        }
    }

    @Transactional
    public void onLike(Long userId, Video video) {
        applyVideoTopics(userId, video.getId(), properties.getInterest().getLikeBoost(), 1.0);
    }

    @Transactional
    public void onSave(Long userId, Video video) {
        applyVideoTopics(userId, video.getId(), properties.getInterest().getSaveBoost(), 1.0);
    }

    @Transactional
    public void onComment(Long userId, Video video) {
        applyVideoTopics(userId, video.getId(), properties.getInterest().getCommentBoost(), 1.0);
    }

    @Transactional
    public void onShare(Long userId, Video video) {
        applyVideoTopics(userId, video.getId(), properties.getInterest().getShareBoost(), 1.0);
    }

    @Transactional
    public void onFollowCreator(Long userId, Long creatorId, List<Video> recentCreatorVideos) {
        if (recentCreatorVideos == null) {
            return;
        }
        double boost = properties.getInterest().getFollowBoost();
        for (Video video : recentCreatorVideos.stream().limit(5).toList()) {
            applyVideoTopics(userId, video.getId(), boost, 0.75);
        }
    }

    private void applyVideoTopics(Long userId, Long videoId, double signalWeight, double completion) {
        if (signalWeight == 0) {
            return;
        }
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return;
        }
        List<VideoTopic> topics = videoTopicRepository.findByVideoIdOrderByScoreDesc(videoId);
        if (topics.isEmpty()) {
            return;
        }
        for (VideoTopic vt : topics) {
            var topic = vt.getTopic();
            if (topic == null) {
                continue;
            }
            UserTopicInterest interest = userTopicInterestRepository
                .findByUserIdAndTopicId(userId, topic.getId())
                .orElseGet(() -> new UserTopicInterest(user, topic));
            double topicWeight = vt.getScore();
            double delta = signalWeight * topicWeight * (0.65 + completion * 0.35);
            double next = interest.getScore() * DECAY + delta;
            interest.setScore(clamp(next));
            interest.setSignalCount(interest.getSignalCount() + 1);
            userTopicInterestRepository.save(interest);
        }
    }

    private static double completionRate(long watchedMs, Long durationMs) {
        if (durationMs == null || durationMs <= 0) {
            return watchedMs >= 2000 ? 0.5 : 0.1;
        }
        return Math.min(1.0, watchedMs * 1.0 / durationMs);
    }

    private static double clamp(double value) {
        return Math.max(MIN_SCORE, Math.min(MAX_SCORE, value));
    }
}
