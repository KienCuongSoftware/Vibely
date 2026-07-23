package com.vibely.backend.translation;

import java.time.Duration;
import java.util.Optional;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

@Component
public class TranslationCacheService {

    private final ObjectProvider<StringRedisTemplate> redisProvider;
    private final TranslationProperties properties;

    public TranslationCacheService(
        ObjectProvider<StringRedisTemplate> redisProvider,
        TranslationProperties properties
    ) {
        this.redisProvider = redisProvider;
        this.properties = properties;
    }

    public Optional<String> get(String sourceHash, String sourceLang, String targetLang) {
        StringRedisTemplate redis = redisProvider.getIfAvailable();
        if (redis == null) {
            return Optional.empty();
        }
        try {
            String value = redis.opsForValue().get(key(sourceHash, sourceLang, targetLang));
            if (value == null || value.isBlank()) {
                return Optional.empty();
            }
            return Optional.of(value);
        } catch (Exception ex) {
            return Optional.empty();
        }
    }

    public void put(String sourceHash, String sourceLang, String targetLang, String translatedText) {
        StringRedisTemplate redis = redisProvider.getIfAvailable();
        if (redis == null || translatedText == null) {
            return;
        }
        try {
            redis.opsForValue().set(
                key(sourceHash, sourceLang, targetLang),
                translatedText,
                Duration.ofSeconds(Math.max(60, properties.getRedisTtlSeconds()))
            );
        } catch (Exception ignored) {
            // Redis optional
        }
    }

    private static String key(String sourceHash, String sourceLang, String targetLang) {
        return "tr:desc:" + sourceHash + ":" + nullToUnd(sourceLang) + ":" + nullToUnd(targetLang);
    }

    private static String nullToUnd(String value) {
        return value == null || value.isBlank() ? "und" : value;
    }
}
