package com.vibely.backend.live.repository;

import com.vibely.backend.live.entity.LiveReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LiveReportRepository extends JpaRepository<LiveReport, Long> {

    @Query("""
        select count(r) > 0 from LiveReport r
        where r.reporterId = :reporterId and r.liveId = :liveId
          and ((:commentId is null and r.commentId is null) or r.commentId = :commentId)
          and r.status = com.vibely.backend.live.entity.LiveReportStatus.OPEN
        """)
    boolean existsOpenReport(
        @Param("reporterId") Long reporterId,
        @Param("liveId") Long liveId,
        @Param("commentId") Long commentId
    );
}
