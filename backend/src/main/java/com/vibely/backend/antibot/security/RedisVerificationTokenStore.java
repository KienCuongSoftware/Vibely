package com.vibely.backend.antibot.security;

import com.vibely.backend.antibot.config.AntiBotProperties;
import com.vibely.backend.antibot.redis.AntiBotRedisKeys;
import java.time.Duration;
import java.util.Optional;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "app.redis.enabled", havingValue = "true")
public class RedisVerificationTokenStore implements VerificationTokenStore {

    private final StringRedisTemplate redis;
    private final AntiBotTokenSigner tokenSigner;
    private final AntiBotProperties properties;

    public RedisVerificationTokenStore(
        StringRedisTemplate shareStringRedisTemplate,
        AntiBotTokenSigner tokenSigner,
        AntiBotProperties properties
    ) {
        this.redis = shareStringRedisTemplate;
        this.tokenSigner = tokenSigner;
        this.properties = properties;
    }

    @Override
    public boolean validateUnused(String token, String expectedPurpose) {
        Optional<VerificationTokenClaims> claims = tokenSigner.parseVerificationToken(token, expectedPurpose);
        if (claims.isEmpty()) {
            return false;
        }
        String tokenHash = AntiBotHashing.sha256Hex(token);
        String key = properties.prefixed(AntiBotRedisKeys.VERIFICATION + "used:" + tokenHash);
        return !Boolean.TRUE.equals(redis.hasKey(key));
    }

    @Override
    public boolean consume(String token, String expectedPurpose) {
        Optional<VerificationTokenClaims> claims = tokenSigner.parseVerificationToken(token, expectedPurpose);
        if (claims.isEmpty()) {
            return false;
        }
        String tokenHash = AntiBotHashing.sha256Hex(token);
        String key = properties.prefixed(AntiBotRedisKeys.VERIFICATION + "used:" + tokenHash);
        Boolean firstUse = redis.opsForValue().setIfAbsent(key, "1", Duration.ofSeconds(
            properties.getVerificationTokenTtlSeconds() + 30
        ));
        return Boolean.TRUE.equals(firstUse);
    }
}
