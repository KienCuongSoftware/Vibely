package com.vibely.backend.interaction;

import com.vibely.backend.studio.DailyCountProjection;
import com.vibely.backend.video.VideoStatus;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VideoViewRepository extends JpaRepository<VideoViewEntity, Long> {
    long countByVideoAuthorIdAndVideoStatusNotAndCreatedAtGreaterThanEqual(
        Long authorId,
        VideoStatus excludedStatus,
        LocalDateTime from
    );

    @Query("""
        select function('date', vv.createdAt) as day, count(vv.id) as total
        from VideoViewEntity vv
        where vv.video.author.id = :authorId and vv.video.status <> :excludedStatus and vv.createdAt >= :from
        group by function('date', vv.createdAt)
        order by function('date', vv.createdAt)
        """)
    List<DailyCountProjection> countDailyByAuthorSinceExcludingStatus(
        @Param("authorId") Long authorId,
        @Param("from") LocalDateTime from,
        @Param("excludedStatus") VideoStatus excludedStatus
    );
}
