package com.vibely.backend.moderation;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ModerationReportRepository extends JpaRepository<ModerationReportEntity, Long> {
    Optional<ModerationReportEntity> findByJob_Id(Long jobId);
}
