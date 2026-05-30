package com.vibely.backend.interaction;

import com.vibely.backend.studio.DailyCountProjection;
import com.vibely.backend.video.VideoStatus;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VideoViewRepository extends JpaRepository<VideoViewEntity, Long> {
    long countByVideo_Id(Long videoId);

    @Query("SELECT vv.video.id, COUNT(vv) FROM VideoViewEntity vv WHERE vv.video.id IN :ids GROUP BY vv.video.id")
    List<Object[]> countGroupedByVideoIds(@Param("ids") Collection<Long> ids);

    long countByVideo_Author_IdAndVideo_Status(Long authorId, VideoStatus status);

    @Query("""
        select count(vv) from VideoViewEntity vv
        where vv.video.author.id = :authorId
          and vv.video.status in :statuses
          and vv.createdAt >= :from
        """)
    long countViewsForAuthorVideoStatusesSince(
        @Param("authorId") Long authorId,
        @Param("statuses") List<VideoStatus> statuses,
        @Param("from") LocalDateTime from
    );

    @Query("""
        select cast(vv.createdAt as date) as day, count(vv.id) as total
        from VideoViewEntity vv
        where vv.video.author.id = :authorId
          and vv.video.status in :statuses
          and vv.createdAt >= :from
        group by cast(vv.createdAt as date)
        order by cast(vv.createdAt as date)
        """)
    List<DailyCountProjection> countDailyViewsForAuthorVideoStatusesSince(
        @Param("authorId") Long authorId,
        @Param("statuses") List<VideoStatus> statuses,
        @Param("from") LocalDateTime from
    );

    @Query("""
        select count(vv) from VideoViewEntity vv
        where vv.video.id = :videoId and vv.createdAt >= :from
        """)
    long countViewsForVideoSince(@Param("videoId") Long videoId, @Param("from") LocalDateTime from);

    @Query("""
        select cast(vv.createdAt as date) as day, count(vv.id) as total
        from VideoViewEntity vv
        where vv.video.id = :videoId and vv.createdAt >= :from
        group by cast(vv.createdAt as date)
        order by cast(vv.createdAt as date)
        """)
    List<DailyCountProjection> countDailyViewsForVideoSince(
        @Param("videoId") Long videoId,
        @Param("from") LocalDateTime from
    );

    @Query("""
        select new com.vibely.backend.interaction.PlaybackSample(vv.watchedMs, vv.durationMs)
        from VideoViewEntity vv
        where vv.video.id = :videoId
          and vv.createdAt >= :from
        order by vv.id
        """)
    List<PlaybackSample> findPlaybackSamplesForVideoSince(
        @Param("videoId") Long videoId,
        @Param("from") LocalDateTime from
    );

    @Query("SELECT COALESCE(SUM(vv.watchedMs), 0) FROM VideoViewEntity vv WHERE vv.video.id = :videoId")
    long sumWatchedMsByVideoId(@Param("videoId") Long videoId);

    @Query("""
        SELECT COALESCE(AVG(
            CASE WHEN vv.durationMs IS NOT NULL AND vv.durationMs > 0
                THEN LEAST(1.0, vv.watchedMs * 1.0 / vv.durationMs)
                ELSE NULL END
        ), 0)
        FROM VideoViewEntity vv
        WHERE vv.video.id = :videoId
        """)
    double avgCompletionRateByVideoId(@Param("videoId") Long videoId);

    @Query("""
        SELECT CASE WHEN COUNT(vv) <= 1 THEN 0
            ELSE LEAST(1.0, (COUNT(vv) - COUNT(DISTINCT COALESCE(vv.watchedMs, 0))) * 1.0 / COUNT(vv))
            END
        FROM VideoViewEntity vv
        WHERE vv.video.id = :videoId
        """)
    double rewatchRateByVideoId(@Param("videoId") Long videoId);
}
