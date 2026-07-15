package com.vibely.backend.moderation;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ModerationDecisionRepository extends JpaRepository<ModerationDecisionEntity, Long> {
    Optional<ModerationDecisionEntity> findByVideo_Id(Long videoId);
}
