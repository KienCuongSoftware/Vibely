package com.vibely.backend.antibot.persistence;

import com.vibely.backend.antibot.persistence.entity.AntiBotTrustScoreEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AntiBotTrustScoreRepository extends JpaRepository<AntiBotTrustScoreEntity, Long> {
    Optional<AntiBotTrustScoreEntity> findBySubjectTypeAndSubjectKey(String subjectType, String subjectKey);
}
