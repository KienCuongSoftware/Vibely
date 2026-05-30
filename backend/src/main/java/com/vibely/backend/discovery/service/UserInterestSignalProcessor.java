package com.vibely.backend.discovery.service;

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
    private static final double DECAY = 0.92;

    private final UserTopicInterestRepository userTopicInterestRepository;
    private final VideoTopicRepository videoTopicRepository;
    private final UserRepository userRepository;

    public UserInterestSignalProcessor(
        UserTopicInterestRepository userTopicInterestRepository,
        VideoTopicRepository videoTopicRepository,
        UserRepository userRepository
    ) {
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
        double weight = 0.15 + completion * 0.35;
        applyVideoTopics(userId, video.getId(), weight);
    }

    @Transactional
    public void onLike(Long userId, Video video) {
        applyVideoTopics(userId, video.getId(), 0.45);
    }

    @Transactional
    public void onSave(Long userId, Video video) {
        applyVideoTopics(userId, video.getId(), 0.55);
    }

    @Transactional
    public void onComment(Long userId, Video video) {
        applyVideoTopics(userId, video.getId(), 0.35);
    }

    @Transactional
    public void onShare(Long userId, Video video) {
        applyVideoTopics(userId, video.getId(), 0.65);
    }

    @Transactional
    public void onFollowCreator(Long userId, Long creatorId, List<Video> recentCreatorVideos) {
        if (recentCreatorVideos == null) {
            return;
        }
        for (Video video : recentCreatorVideos.stream().limit(5).toList()) {
            applyVideoTopics(userId, video.getId(), 0.25);
        }
    }

    private void applyVideoTopics(Long userId, Long videoId, double signalWeight) {
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
            double blended = interest.getScore() * DECAY + signalWeight * vt.getScore();
            interest.setScore(Math.min(1.0, blended));
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
}
