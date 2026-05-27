package com.vibely.backend.explore.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vibely.backend.explore.dto.ExplorePageDto;
import java.time.Duration;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
public class ExploreCacheService {
    private final boolean redisEnabled;
    private final String prefix;
    private final int ttlSeconds;
    private final ObjectMapper objectMapper;
    private final org.springframework.beans.factory.ObjectProvider<StringRedisTemplate> redisTemplateProvider;

    public ExploreCacheService(
        @Value("${app.redis.enabled:false}") boolean redisEnabled,
        @Value("${app.redis.key-prefix:vibely}") String prefix,
        @Value("${app.explore.cache-ttl-seconds:180}") int ttlSeconds,
        ObjectMapper objectMapper,
        org.springframework.beans.factory.ObjectProvider<StringRedisTemplate> redisTemplateProvider
    ) {
        this.redisEnabled = redisEnabled;
        this.prefix = prefix;
        this.ttlSeconds = ttlSeconds;
        this.objectMapper = objectMapper;
        this.redisTemplateProvider = redisTemplateProvider;
    }

    public Optional<ExplorePageDto> getPage(String key) {
        StringRedisTemplate redis = redisTemplateProvider.getIfAvailable();
        if (!redisEnabled || redis == null) return Optional.empty();
        try {
            String raw = redis.opsForValue().get(buildKey(key));
            if (raw == null || raw.isBlank()) return Optional.empty();
            return Optional.of(objectMapper.readValue(raw, new TypeReference<>() {
            }));
        } catch (Exception ignored) {
            return Optional.empty();
        }
    }

    public void putPage(String key, ExplorePageDto value) {
        StringRedisTemplate redis = redisTemplateProvider.getIfAvailable();
        if (!redisEnabled || redis == null || value == null) return;
        try {
            redis.opsForValue().set(buildKey(key), objectMapper.writeValueAsString(value), Duration.ofSeconds(ttlSeconds));
        } catch (Exception ignored) {
        }
    }

    public void evictByPrefix(String keyPrefix) {
        StringRedisTemplate redis = redisTemplateProvider.getIfAvailable();
        if (!redisEnabled || redis == null) return;
        try {
            var keys = redis.keys(buildKey(keyPrefix) + "*");
            if (keys != null && !keys.isEmpty()) redis.delete(keys);
        } catch (Exception ignored) {
        }
    }

    private String buildKey(String key) {
        return prefix + ":explore:" + key;
    }
}
