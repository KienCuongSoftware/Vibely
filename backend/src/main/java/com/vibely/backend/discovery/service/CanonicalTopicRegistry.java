package com.vibely.backend.discovery.service;

import com.vibely.backend.discovery.model.Topic;
import com.vibely.backend.discovery.repository.TopicAliasRepository;
import com.vibely.backend.discovery.repository.TopicRepository;
import jakarta.annotation.PostConstruct;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

@Service
public class CanonicalTopicRegistry {
    private final TopicAliasRepository topicAliasRepository;
    private final TopicRepository topicRepository;
    private volatile Map<String, String> aliasToCanonical = Map.of();

    public CanonicalTopicRegistry(TopicAliasRepository topicAliasRepository, TopicRepository topicRepository) {
        this.topicAliasRepository = topicAliasRepository;
        this.topicRepository = topicRepository;
    }

    @PostConstruct
    void loadAliases() {
        refresh();
    }

    public void refresh() {
        Map<String, String> next = new ConcurrentHashMap<>();
        for (Object[] row : topicAliasRepository.findAllAliasSlugPairs()) {
            String alias = row[0] == null ? "" : String.valueOf(row[0]);
            String slug = row[1] == null ? "" : String.valueOf(row[1]);
            if (!alias.isBlank() && !slug.isBlank()) {
                next.put(normalizeKey(alias), slug);
            }
        }
        aliasToCanonical = Map.copyOf(next);
    }

    public String resolveCanonicalSlug(String rawSlug) {
        String normalized = OpenAiContentUnderstandingService.normalizeTopic(rawSlug);
        if (normalized.isBlank()) {
            return normalized;
        }
        String mapped = aliasToCanonical.get(normalized);
        if (mapped != null) {
            return mapped;
        }
        return topicAliasRepository.findCanonicalSlugByAlias(normalized).orElse(normalized);
    }

    public Topic resolveCanonicalTopic(String rawSlug) {
        String canonicalSlug = resolveCanonicalSlug(rawSlug);
        return topicRepository.findBySlug(canonicalSlug)
            .orElseGet(() -> topicRepository.findBySlug(OpenAiContentUnderstandingService.normalizeTopic(rawSlug))
                .orElse(null));
    }

    private static String normalizeKey(String raw) {
        return raw == null ? "" : raw.trim().toLowerCase(Locale.ROOT);
    }
}
