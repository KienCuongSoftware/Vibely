package com.vibely.backend.antibot.security;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "app.redis.enabled", havingValue = "false", matchIfMissing = true)
public class InMemoryVerificationTokenStore implements VerificationTokenStore {

    private final AntiBotTokenSigner tokenSigner;
    private final Map<String, Long> consumed = new ConcurrentHashMap<>();

    public InMemoryVerificationTokenStore(AntiBotTokenSigner tokenSigner) {
        this.tokenSigner = tokenSigner;
    }

    @Override
    public boolean validateUnused(String token, String expectedPurpose) {
        Optional<VerificationTokenClaims> claims = tokenSigner.parseVerificationToken(token, expectedPurpose);
        if (claims.isEmpty()) {
            return false;
        }
        String tokenHash = AntiBotHashing.sha256Hex(token);
        return !consumed.containsKey(tokenHash);
    }

    @Override
    public boolean consume(String token, String expectedPurpose) {
        Optional<VerificationTokenClaims> claims = tokenSigner.parseVerificationToken(token, expectedPurpose);
        if (claims.isEmpty()) {
            return false;
        }
        String tokenHash = AntiBotHashing.sha256Hex(token);
        return consumed.putIfAbsent(tokenHash, System.currentTimeMillis()) == null;
    }
}
