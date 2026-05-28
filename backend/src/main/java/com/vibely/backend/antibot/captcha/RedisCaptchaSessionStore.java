package com.vibely.backend.antibot.captcha;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vibely.backend.antibot.config.AntiBotProperties;
import com.vibely.backend.antibot.redis.AntiBotRedisKeys;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "app.redis.enabled", havingValue = "true")
public class RedisCaptchaSessionStore implements CaptchaSessionStore {

    private final StringRedisTemplate redis;
    private final AntiBotProperties properties;
    private final ObjectMapper objectMapper;

    public RedisCaptchaSessionStore(
        StringRedisTemplate shareStringRedisTemplate,
        AntiBotProperties properties,
        ObjectMapper objectMapper
    ) {
        this.redis = shareStringRedisTemplate;
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    @Override
    public void save(CaptchaSession session) {
        try {
            String key = key(session.challengeId());
            redis.opsForValue().set(key, objectMapper.writeValueAsString(session));
            long ttl = Math.max(1, Duration.between(Instant.now(), session.expiresAt()).getSeconds());
            redis.expire(key, Duration.ofSeconds(ttl));
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Failed to serialize captcha session", ex);
        }
    }

    @Override
    public Optional<CaptchaSession> find(String challengeId) {
        String raw = redis.opsForValue().get(key(challengeId));
        if (raw == null || raw.isBlank()) {
            return Optional.empty();
        }
        try {
            CaptchaSession session = objectMapper.readValue(raw, CaptchaSession.class);
            if (session.expiresAt().isBefore(Instant.now())) {
                redis.delete(key(challengeId));
                return Optional.empty();
            }
            return Optional.of(session);
        } catch (JsonProcessingException ex) {
            redis.delete(key(challengeId));
            return Optional.empty();
        }
    }

    @Override
    public boolean consume(String challengeId) {
        Optional<CaptchaSession> existing = find(challengeId);
        if (existing.isEmpty() || existing.get().consumed()) {
            return false;
        }
        CaptchaSession session = existing.get();
        save(new CaptchaSession(
            session.challengeId(),
            session.type(),
            session.correctAngle(),
            session.displayRotation(),
            session.imageBase64(),
            session.puzzleBase64(),
            session.sliderTargetX(),
            session.deviceHash(),
            session.ipHash(),
            session.createdAt(),
            session.expiresAt(),
            true,
            session.attempts(),
            session.multiStep()
        ));
        return true;
    }

    @Override
    public void incrementAttempts(String challengeId) {
        find(challengeId).ifPresent(session -> save(new CaptchaSession(
            session.challengeId(),
            session.type(),
            session.correctAngle(),
            session.displayRotation(),
            session.imageBase64(),
            session.puzzleBase64(),
            session.sliderTargetX(),
            session.deviceHash(),
            session.ipHash(),
            session.createdAt(),
            session.expiresAt(),
            session.consumed(),
            session.attempts() + 1,
            session.multiStep()
        )));
    }

    private String key(String challengeId) {
        return properties.prefixed(AntiBotRedisKeys.CAPTCHA_SESSION + challengeId);
    }
}
