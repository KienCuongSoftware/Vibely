package com.vibely.backend.moderation;

import com.vibely.backend.studio.DailyCountProjection;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ModerationReportRepository extends JpaRepository<ModerationReportEntity, Long> {
    Optional<ModerationReportEntity> findByJob_Id(Long jobId);

    long countByCreatedAtGreaterThanEqual(LocalDateTime createdAt);

    @Query("""
        select cast(r.createdAt as date) as day, count(r.id) as total
        from ModerationReportEntity r
        where r.createdAt >= :from
        group by cast(r.createdAt as date)
        order by cast(r.createdAt as date)
        """)
    List<DailyCountProjection> countDailyCreatedSince(@Param("from") LocalDateTime from);
}
