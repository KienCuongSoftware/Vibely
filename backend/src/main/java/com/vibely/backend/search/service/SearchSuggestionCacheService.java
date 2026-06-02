package com.vibely.backend.search.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vibely.backend.search.dto.SearchSuggestResponseDto;
import java.time.Duration;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
public class SearchSuggestionCacheService {

    private final boolean redisEnabled;
    private final String prefix;
    private final int ttlSeconds;
    private final ObjectMapper objectMapper;
    private final org.springframework.beans.factory.ObjectProvider<StringRedisTemplate> redisTemplateProvider;

    public SearchSuggestionCacheService(
        @Value("${app.redis.enabled:false}") boolean redisEnabled,
        @Value("${app.redis.key-prefix:vibely}") String prefix,
        @Value("${app.search.suggest-cache-ttl-seconds:300}") int ttlSeconds,
        ObjectMapper objectMapper,
        org.springframework.beans.factory.ObjectProvider<StringRedisTemplate> redisTemplateProvider
    ) {
        this.redisEnabled = redisEnabled;
        this.prefix = prefix;
        this.ttlSeconds = ttlSeconds;
        this.objectMapper = objectMapper;
        this.redisTemplateProvider = redisTemplateProvider;
    }

    public Optional<SearchSuggestResponseDto> get(String normalizedQuery) {
        StringRedisTemplate redis = redisTemplateProvider.getIfAvailable();
        if (!redisEnabled || redis == null) {
            return Optional.empty();
        }
        try {
            String raw = redis.opsForValue().get(buildKey(normalizedQuery));
            if (raw == null || raw.isBlank()) {
                return Optional.empty();
            }
            return Optional.of(objectMapper.readValue(raw, new TypeReference<>() {
            }));
        } catch (Exception ignored) {
            return Optional.empty();
        }
    }

    public void put(String normalizedQuery, SearchSuggestResponseDto value) {
        StringRedisTemplate redis = redisTemplateProvider.getIfAvailable();
        if (!redisEnabled || redis == null || value == null) {
            return;
        }
        try {
            redis.opsForValue().set(
                buildKey(normalizedQuery),
                objectMapper.writeValueAsString(value),
                Duration.ofSeconds(ttlSeconds)
            );
        } catch (Exception ignored) {
        }
    }

    private String buildKey(String normalizedQuery) {
        return prefix + ":search:suggest:" + normalizedQuery;
    }
}
