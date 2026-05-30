package com.vibely.backend.discovery.service;

import com.vibely.backend.discovery.dto.ContentUnderstandingResult;
import com.vibely.backend.discovery.model.Topic;
import com.vibely.backend.discovery.model.VideoTopic;
import com.vibely.backend.discovery.repository.TopicRepository;
import com.vibely.backend.discovery.repository.VideoTopicRepository;
import com.vibely.backend.video.Video;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TopicGraphService {
    private final TopicRepository topicRepository;
    private final VideoTopicRepository videoTopicRepository;

    public TopicGraphService(TopicRepository topicRepository, VideoTopicRepository videoTopicRepository) {
        this.topicRepository = topicRepository;
        this.videoTopicRepository = videoTopicRepository;
    }

    @Transactional
    public void replaceVideoTopics(Video video, List<ContentUnderstandingResult.ScoredTopic> topics, String source) {
        videoTopicRepository.deleteByVideoId(video.getId());
        for (ContentUnderstandingResult.ScoredTopic scored : topics) {
            if (scored.name() == null || scored.name().isBlank()) {
                continue;
            }
            Topic topic = upsertTopic(scored.name());
            videoTopicRepository.save(new VideoTopic(video, topic, scored.score(), source));
        }
    }

    @Transactional
    public Topic upsertTopic(String slug) {
        String normalized = OpenAiContentUnderstandingService.normalizeTopic(slug);
        return topicRepository.findBySlug(normalized)
            .orElseGet(() -> {
                Topic topic = new Topic();
                topic.setSlug(normalized);
                topic.setDisplayName(toDisplayName(normalized));
                return topicRepository.save(topic);
            });
    }

    private static String toDisplayName(String slug) {
        String[] parts = slug.split("_");
        StringBuilder sb = new StringBuilder();
        for (String part : parts) {
            if (part.isBlank()) {
                continue;
            }
            if (!sb.isEmpty()) {
                sb.append(' ');
            }
            sb.append(part.substring(0, 1).toUpperCase(Locale.ROOT));
            if (part.length() > 1) {
                sb.append(part.substring(1));
            }
        }
        return sb.isEmpty() ? slug : sb.toString();
    }
}
