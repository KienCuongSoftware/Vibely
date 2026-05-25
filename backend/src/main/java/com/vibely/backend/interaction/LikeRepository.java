package com.vibely.backend.interaction;

import com.vibely.backend.studio.DailyCountProjection;
import com.vibely.backend.user.User;
import com.vibely.backend.video.Video;
import com.vibely.backend.video.VideoStatus;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LikeRepository extends JpaRepository<LikeEntity, Long> {
    boolean existsByUserAndVideo(User user, Video video);
    void deleteByUserAndVideo(User user, Video video);
    long countByVideo(Video video);
    long countByVideoId(Long videoId);

    @Query("SELECT l.video.id, COUNT(l) FROM LikeEntity l WHERE l.video.id IN :ids GROUP BY l.video.id")
    List<Object[]> countGroupedByVideoIds(@Param("ids") Collection<Long> ids);

    long countByUser(User user);
    long countByVideo_Author_IdAndVideo_Status(Long authorId, VideoStatus status);

    @Query("""
        select count(l) from LikeEntity l
        where l.video.author.id = :authorId
          and l.video.status in :statuses
          and l.createdAt >= :from
        """)
    long countLikesForAuthorVideoStatusesSince(
        @Param("authorId") Long authorId,
        @Param("statuses") List<VideoStatus> statuses,
        @Param("from") LocalDateTime from
    );

    @Query("""
        select cast(l.createdAt as date) as day, count(l.id) as total
        from LikeEntity l
        where l.video.author.id = :authorId
          and l.video.status in :statuses
          and l.createdAt >= :from
        group by cast(l.createdAt as date)
        order by cast(l.createdAt as date)
        """)
    List<DailyCountProjection> countDailyLikesForAuthorVideoStatusesSince(
        @Param("authorId") Long authorId,
        @Param("statuses") List<VideoStatus> statuses,
        @Param("from") LocalDateTime from
    );

    @Query("""
        select count(l) from LikeEntity l
        where l.video.id = :videoId and l.createdAt >= :from
        """)
    long countLikesForVideoSince(@Param("videoId") Long videoId, @Param("from") LocalDateTime from);

    @Query("""
        select cast(l.createdAt as date) as day, count(l.id) as total
        from LikeEntity l
        where l.video.id = :videoId and l.createdAt >= :from
        group by cast(l.createdAt as date)
        order by cast(l.createdAt as date)
        """)
    List<DailyCountProjection> countDailyLikesForVideoSince(
        @Param("videoId") Long videoId,
        @Param("from") LocalDateTime from
    );

    /** Video READY công khai hoặc bài của chính user (chưa gỡ / chưa failed). */
    @Query(
        "SELECT l.video FROM LikeEntity l WHERE l.user = :user AND ("
            + "l.video.status = :ready OR "
            + "(l.video.author.id = :userId AND l.video.status <> :removed AND l.video.status <> :failed)"
            + ") ORDER BY l.id DESC"
    )
    Page<Video> findLikedVideosForUser(
        @Param("user") User user,
        @Param("ready") VideoStatus ready,
        @Param("userId") Long userId,
        @Param("removed") VideoStatus removed,
        @Param("failed") VideoStatus failed,
        Pageable pageable
    );
}
