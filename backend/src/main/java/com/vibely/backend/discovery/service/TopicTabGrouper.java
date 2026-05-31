package com.vibely.backend.discovery.service;

import com.vibely.backend.discovery.model.Topic;
import com.vibely.backend.discovery.model.UserTopicInterest;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;

@Service
public class TopicTabGrouper {
    private static final Set<String> GENERIC_PARENTS = Set.of(
        "music", "gaming", "technology", "food", "fitness", "anime", "lifestyle"
    );

    private static final Map<String, String> TAB_CLUSTER = Map.ofEntries(
        Map.entry("chatgpt", "ai"),
        Map.entry("cursor", "ai"),
        Map.entry("openai", "ai"),
        Map.entry("gpt", "ai"),
        Map.entry("machine_learning", "ai"),
        Map.entry("springboot", "programming"),
        Map.entry("coding", "programming"),
        Map.entry("software", "programming"),
        Map.entry("programming", "programming"),
        Map.entry("edm", "music"),
        Map.entry("vpop", "music"),
        Map.entry("kpop", "music"),
        Map.entry("jpop", "music"),
        Map.entry("remix", "music"),
        Map.entry("valorant", "gaming"),
        Map.entry("lol", "gaming"),
        Map.entry("cs2", "gaming"),
        Map.entry("dota2", "gaming"),
        Map.entry("manga", "anime"),
        Map.entry("cosplay", "anime"),
        Map.entry("makeup", "beauty"),
        Map.entry("skincare", "beauty"),
        Map.entry("meme", "comedy"),
        Map.entry("funny", "comedy")
    );

    public Map<String, GroupedInterest> groupInterests(List<UserTopicInterest> interests) {
        Map<String, GroupedInterest> grouped = new LinkedHashMap<>();
        for (UserTopicInterest interest : interests) {
            Topic topic = interest.getTopic();
            if (topic == null || topic.getSlug() == null) {
                continue;
            }
            GroupKey key = resolveGroupKey(topic);
            grouped.merge(
                key.slug(),
                new GroupedInterest(key.slug(), key.displayName(), interest.getScore(), topic.getId()),
                (left, right) -> new GroupedInterest(
                    left.slug(),
                    left.displayName(),
                    left.aggregatedScore() + right.aggregatedScore(),
                    left.representativeTopicId()
                )
            );
        }
        return grouped;
    }

    private GroupKey resolveGroupKey(Topic topic) {
        String slug = topic.getSlug().toLowerCase(Locale.ROOT);
        String cluster = TAB_CLUSTER.get(slug);
        if (cluster != null) {
            return new GroupKey(cluster, toDisplayName(cluster));
        }
        Topic parent = topic.getParentTopic();
        if (parent != null && parent.getSlug() != null) {
            String parentSlug = parent.getSlug().toLowerCase(Locale.ROOT);
            if (!GENERIC_PARENTS.contains(parentSlug)) {
                return new GroupKey(parentSlug, parent.getDisplayName());
            }
        }
        return new GroupKey(slug, topic.getDisplayName());
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

    private record GroupKey(String slug, String displayName) {
    }

    public record GroupedInterest(
        String slug,
        String displayName,
        double aggregatedScore,
        Long representativeTopicId
    ) {
    }
}
