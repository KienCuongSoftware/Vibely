package com.vibely.backend.enhancement;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EnhancementRuleRepository extends JpaRepository<EnhancementRuleEntity, Long> {

    List<EnhancementRuleEntity> findByEnabledTrueOrderByPriorityAsc();
}
