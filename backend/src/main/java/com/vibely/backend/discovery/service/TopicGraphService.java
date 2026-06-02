package com.vibely.backend.discovery.service;

import com.vibely.backend.discovery.dto.ContentUnderstandingResult;
import com.vibely.backend.discovery.model.Topic;
import com.vibely.backend.discovery.model.VideoTopic;
import com.vibely.backend.discovery.repository.TopicRepository;
import com.vibely.backend.discovery.repository.VideoTopicRepository;
import com.vibely.backend.video.Video;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TopicGraphService {
    private final TopicRepository topicRepository;
    private final VideoTopicRepository videoTopicRepository;
    private final CanonicalTopicRegistry canonicalTopicRegistry;

    public TopicGraphService(
        TopicRepository topicRepository,
        VideoTopicRepository videoTopicRepository,
        CanonicalTopicRegistry canonicalTopicRegistry
    ) {
        this.topicRepository = topicRepository;
        this.videoTopicRepository = videoTopicRepository;
        this.canonicalTopicRegistry = canonicalTopicRegistry;
    }

    @Transactional
    public void replaceVideoTopics(Video video, List<ContentUnderstandingResult.ScoredTopic> topics, String source) {
        videoTopicRepository.deleteByVideoId(video.getId());
        Map<String, Double> merged = new LinkedHashMap<>();
        for (ContentUnderstandingResult.ScoredTopic scored : topics) {
            if (scored.name() == null || scored.name().isBlank()) {
                continue;
            }
            String canonical = canonicalTopicRegistry.resolveCanonicalSlug(scored.name());
            if (canonical.isBlank()) {
                continue;
            }
            double score = scored.score();
            merged.put(canonical, Math.max(merged.getOrDefault(canonical, 0.0), score));
        }
        for (Map.Entry<String, Double> entry : merged.entrySet()) {
            Topic topic = upsertTopic(entry.getKey());
            videoTopicRepository.save(new VideoTopic(video, topic, entry.getValue(), source));
        }
    }

    @Transactional
    public Topic upsertTopic(String slug) {
        String normalized = canonicalTopicRegistry.resolveCanonicalSlug(slug);
        return topicRepository.findBySlug(normalized)
            .orElseGet(() -> {
                Topic topic = new Topic();
                topic.setSlug(normalized);
                topic.setDisplayName(toDisplayName(normalized));
                return topicRepository.save(topic);
            });
    }

    private static String toDisplayName(String slug) {
        if ("ai".equals(slug)) {
            return "AI";
        }
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
