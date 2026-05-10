package com.vibely.backend.interaction;

import com.vibely.backend.studio.DailyCountProjection;
import com.vibely.backend.video.Video;
import com.vibely.backend.video.VideoStatus;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;

public interface CommentRepository extends JpaRepository<CommentEntity, Long> {
    List<CommentEntity> findByVideoOrderByCreatedAtDesc(Video video);
    long countByVideo(Video video);
    long countByVideoId(Long videoId);
    long countByVideoAuthorIdAndVideoStatusNotAndCreatedAtGreaterThanEqual(
        Long authorId,
        VideoStatus excludedStatus,
        LocalDateTime from
    );

    @Query("""
        select function('date', c.createdAt) as day, count(c.id) as total
        from CommentEntity c
        where c.video.author.id = :authorId and c.video.status <> :excludedStatus and c.createdAt >= :from
        group by function('date', c.createdAt)
        order by function('date', c.createdAt)
        """)
    List<DailyCountProjection> countDailyByAuthorSinceExcludingStatus(
        @Param("authorId") Long authorId,
        @Param("from") LocalDateTime from,
        @Param("excludedStatus") VideoStatus excludedStatus
    );

    @Query("""
        select c
        from CommentEntity c
        where c.video.author.id = :authorId and c.video.status <> :excludedStatus
        order by c.createdAt desc
        """)
    List<CommentEntity> findLatestByAuthorIdExcludingStatus(
        @Param("authorId") Long authorId,
        @Param("excludedStatus") VideoStatus excludedStatus,
        Pageable pageable
    );
}
