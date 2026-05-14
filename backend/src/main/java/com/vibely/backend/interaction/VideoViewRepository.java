package com.vibely.backend.interaction;

import com.vibely.backend.studio.DailyCountProjection;
import com.vibely.backend.video.VideoStatus;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VideoViewRepository extends JpaRepository<VideoViewEntity, Long> {
    long countByVideo_Id(Long videoId);

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
}
