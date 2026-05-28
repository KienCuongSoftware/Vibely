package com.vibely.backend.antibot.persistence;

import com.vibely.backend.antibot.persistence.entity.AntiBotCaptchaSessionEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AntiBotCaptchaSessionRepository extends JpaRepository<AntiBotCaptchaSessionEntity, Long> {
    Optional<AntiBotCaptchaSessionEntity> findByChallengeId(String challengeId);
}
