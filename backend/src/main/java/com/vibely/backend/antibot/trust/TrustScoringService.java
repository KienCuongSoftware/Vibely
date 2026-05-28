package com.vibely.backend.antibot.trust;

import com.vibely.backend.antibot.config.AntiBotProperties;
import com.vibely.backend.antibot.dto.TrustEvaluateRequest;
import com.vibely.backend.antibot.dto.TrustEvaluateResponse;
import com.vibely.backend.antibot.persistence.AntiBotTrustScoreRepository;
import com.vibely.backend.antibot.persistence.entity.AntiBotTrustScoreEntity;
import com.vibely.backend.antibot.redis.AntiBotRedisKeys;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TrustScoringService {

    private static final String SUBJECT_USER = "USER";
    private static final String SUBJECT_DEVICE = "DEVICE";

    private final AntiBotProperties properties;
    private final AntiBotTrustScoreRepository repository;
    private final StringRedisTemplate redis;
    private final Map<String, Integer> memoryTrust = new ConcurrentHashMap<>();

    public TrustScoringService(
        AntiBotProperties properties,
        AntiBotTrustScoreRepository repository,
        @Autowired(required = false) StringRedisTemplate shareStringRedisTemplate
    ) {
        this.properties = properties;
        this.repository = repository;
        this.redis = shareStringRedisTemplate;
    }

    public TrustEvaluateResponse evaluate(TrustEvaluateRequest request) {
        int userTrust = request.userId() == null
            ? properties.getDefaultTrustScore()
            : getUserTrustScore(String.valueOf(request.userId()));
        int deviceTrust = request.deviceHash() == null
            ? properties.getDefaultTrustScore()
            : getDeviceTrustScore(request.deviceHash());

        boolean bypass = userTrust >= 80 && deviceTrust >= 75;
        return new TrustEvaluateResponse(userTrust, deviceTrust, bypass);
    }

    public int getUserTrustScore(String userId) {
        return getTrustScore(SUBJECT_USER, userId);
    }

    public int getDeviceTrustScore(String deviceHash) {
        return getTrustScore(SUBJECT_DEVICE, deviceHash);
    }

    @Transactional
    public void recordCaptchaSuccess(String deviceHash, Long userId) {
        if (deviceHash != null) {
            adjustTrust(SUBJECT_DEVICE, deviceHash, +3);
        }
        if (userId != null) {
            adjustTrust(SUBJECT_USER, String.valueOf(userId), +2);
        }
    }

    @Transactional
    public void recordCaptchaFailure(String deviceHash, Long userId) {
        if (deviceHash != null) {
            adjustTrust(SUBJECT_DEVICE, deviceHash, -8);
        }
        if (userId != null) {
            adjustTrust(SUBJECT_USER, String.valueOf(userId), -5);
        }
    }

    public void upsertDeviceTrust(String deviceHash, int trustScore) {
        cacheTrust(SUBJECT_DEVICE, deviceHash, trustScore);
        persistTrust(SUBJECT_DEVICE, deviceHash, trustScore);
    }

    private void adjustTrust(String subjectType, String subjectKey, int delta) {
        int current = getTrustScore(subjectType, subjectKey);
        int updated = Math.max(0, Math.min(100, current + delta));
        cacheTrust(subjectType, subjectKey, updated);
        persistTrust(subjectType, subjectKey, updated);
    }

    private int getTrustScore(String subjectType, String subjectKey) {
        Integer cached = readCache(subjectType, subjectKey);
        if (cached != null) {
            return cached;
        }
        return repository.findBySubjectTypeAndSubjectKey(subjectType, subjectKey)
            .map(AntiBotTrustScoreEntity::getTrustScore)
            .orElse(properties.getDefaultTrustScore());
    }

    private void persistTrust(String subjectType, String subjectKey, int trustScore) {
        AntiBotTrustScoreEntity entity = repository
            .findBySubjectTypeAndSubjectKey(subjectType, subjectKey)
            .orElseGet(AntiBotTrustScoreEntity::new);
        entity.setSubjectType(subjectType);
        entity.setSubjectKey(subjectKey);
        entity.setTrustScore(trustScore);
        entity.setUpdatedAt(Instant.now());
        if (entity.getId() == null) {
            entity.setSuccessfulCaptchaCount(0);
            entity.setFailedCaptchaCount(0);
            entity.setAbuseSignalCount(0);
        }
        repository.save(entity);
    }

    private void cacheTrust(String subjectType, String subjectKey, int trustScore) {
        String cacheKey = subjectType + ":" + subjectKey;
        memoryTrust.put(cacheKey, trustScore);
        if (redis != null) {
            String redisKey = properties.prefixed(
                SUBJECT_DEVICE.equals(subjectType)
                    ? AntiBotRedisKeys.TRUST_DEVICE + subjectKey
                    : AntiBotRedisKeys.TRUST_USER + subjectKey
            );
            redis.opsForValue().set(redisKey, String.valueOf(trustScore), Duration.ofDays(7));
        }
    }

    private Integer readCache(String subjectType, String subjectKey) {
        String cacheKey = subjectType + ":" + subjectKey;
        Integer memory = memoryTrust.get(cacheKey);
        if (memory != null) {
            return memory;
        }
        if (redis == null) {
            return null;
        }
        String redisKey = properties.prefixed(
            SUBJECT_DEVICE.equals(subjectType)
                ? AntiBotRedisKeys.TRUST_DEVICE + subjectKey
                : AntiBotRedisKeys.TRUST_USER + subjectKey
        );
        String raw = redis.opsForValue().get(redisKey);
        if (raw == null) {
            return null;
        }
        try {
            return Integer.parseInt(raw);
        } catch (NumberFormatException ex) {
            return null;
        }
    }
}
