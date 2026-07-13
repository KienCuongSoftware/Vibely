package com.vibely.backend.originality;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OriginalityReportRepository extends JpaRepository<OriginalityReportEntity, Long> {

    Optional<OriginalityReportEntity> findByVideo_Id(Long videoId);

    @Query(
        """
        select r from OriginalityReportEntity r
        left join fetch r.matchedVideo
        where r.video.id = :videoId
        """
    )
    Optional<OriginalityReportEntity> findDetailedByVideoId(@Param("videoId") Long videoId);
}
