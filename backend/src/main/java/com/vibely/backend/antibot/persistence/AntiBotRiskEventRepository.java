package com.vibely.backend.antibot.persistence;

import com.vibely.backend.antibot.persistence.entity.AntiBotRiskEventEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AntiBotRiskEventRepository extends JpaRepository<AntiBotRiskEventEntity, Long> {
}
