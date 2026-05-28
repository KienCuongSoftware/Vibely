package com.vibely.backend.antibot.captcha;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "app.redis.enabled", havingValue = "false", matchIfMissing = true)
public class InMemoryCaptchaSessionStore implements CaptchaSessionStore {

    private final Map<String, CaptchaSession> sessions = new ConcurrentHashMap<>();

    @Override
    public void save(CaptchaSession session) {
        sessions.put(session.challengeId(), session);
    }

    @Override
    public Optional<CaptchaSession> find(String challengeId) {
        CaptchaSession session = sessions.get(challengeId);
        if (session == null) {
            return Optional.empty();
        }
        if (session.expiresAt().isBefore(Instant.now())) {
            sessions.remove(challengeId);
            return Optional.empty();
        }
        return Optional.of(session);
    }

    @Override
    public boolean consume(String challengeId) {
        CaptchaSession session = sessions.get(challengeId);
        if (session == null || session.consumed()) {
            return false;
        }
        sessions.put(challengeId, copy(session, true));
        return true;
    }

    @Override
    public void incrementAttempts(String challengeId) {
        sessions.computeIfPresent(challengeId, (id, session) -> copy(session, session.consumed(), session.attempts() + 1));
    }

    private CaptchaSession copy(CaptchaSession session, boolean consumed) {
        return copy(session, consumed, session.attempts());
    }

    private CaptchaSession copy(CaptchaSession session, boolean consumed, int attempts) {
        return new CaptchaSession(
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
            consumed,
            attempts,
            session.multiStep()
        );
    }
}
