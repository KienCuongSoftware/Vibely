package com.vibely.backend.antibot.captcha;

import java.util.Optional;

public interface CaptchaSessionStore {

    void save(CaptchaSession session);

    Optional<CaptchaSession> find(String challengeId);

    boolean consume(String challengeId);

    void incrementAttempts(String challengeId);
}
