package com.vibely.backend.antibot.persistence;

import com.vibely.backend.antibot.persistence.entity.AntiBotBehaviorSampleEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AntiBotBehaviorSampleRepository extends JpaRepository<AntiBotBehaviorSampleEntity, Long> {
}
