package com.vibely.backend.interaction.repository;

import com.vibely.backend.interaction.entity.CommentEntity;
import com.vibely.backend.studio.DailyCountProjection;
import com.vibely.backend.video.Video;
import com.vibely.backend.video.VideoStatus;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CommentRepository extends JpaRepository<CommentEntity, Long> {
    List<CommentEntity> findByVideoOrderByCreatedAtDesc(Video video);
    long countByVideo(Video video);
    long countByVideoId(Long videoId);

    @Query("SELECT c.video.id, COUNT(c) FROM CommentEntity c WHERE c.video.id IN :ids GROUP BY c.video.id")
    List<Object[]> countGroupedByVideoIds(@Param("ids") Collection<Long> ids);

    @Query("""
        select count(c) from CommentEntity c
        where c.video.author.id = :authorId
          and c.video.status in :statuses
          and c.createdAt >= :from
        """)
    long countCommentsForAuthorVideoStatusesSince(
        @Param("authorId") Long authorId,
        @Param("statuses") List<VideoStatus> statuses,
        @Param("from") LocalDateTime from
    );

    @Query("""
        select cast(c.createdAt as date) as day, count(c.id) as total
        from CommentEntity c
        where c.video.author.id = :authorId
          and c.video.status in :statuses
          and c.createdAt >= :from
        group by cast(c.createdAt as date)
        order by cast(c.createdAt as date)
        """)
    List<DailyCountProjection> countDailyCommentsForAuthorVideoStatusesSince(
        @Param("authorId") Long authorId,
        @Param("statuses") List<VideoStatus> statuses,
        @Param("from") LocalDateTime from
    );

    @Query("""
        select count(c) from CommentEntity c
        where c.video.id = :videoId and c.createdAt >= :from
        """)
    long countCommentsForVideoSince(@Param("videoId") Long videoId, @Param("from") LocalDateTime from);

    @Query("""
        select cast(c.createdAt as date) as day, count(c.id) as total
        from CommentEntity c
        where c.video.id = :videoId and c.createdAt >= :from
        group by cast(c.createdAt as date)
        order by cast(c.createdAt as date)
        """)
    List<DailyCountProjection> countDailyCommentsForVideoSince(
        @Param("videoId") Long videoId,
        @Param("from") LocalDateTime from
    );

    @Query("""
        select c
        from CommentEntity c
        where c.video.author.id = :authorId and c.video.status in :statuses
        order by c.createdAt desc
        """)
    List<CommentEntity> findLatestByAuthorIdAndVideoStatusIn(
        @Param("authorId") Long authorId,
        @Param("statuses") List<VideoStatus> statuses,
        Pageable pageable
    );
}
