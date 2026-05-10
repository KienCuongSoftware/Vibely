package com.vibely.backend.interaction;

import com.vibely.backend.studio.DailyCountProjection;
import com.vibely.backend.user.User;
import com.vibely.backend.video.Video;
import com.vibely.backend.video.VideoStatus;
import java.time.LocalDateTime;
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

    long countByUser(User user);
    long countByVideoAuthorIdAndVideoStatusNotAndCreatedAtGreaterThanEqual(
        Long authorId,
        VideoStatus excludedStatus,
        LocalDateTime from
    );

    @Query("""
        select function('date', l.createdAt) as day, count(l.id) as total
        from LikeEntity l
        where l.video.author.id = :authorId and l.video.status <> :excludedStatus and l.createdAt >= :from
        group by function('date', l.createdAt)
        order by function('date', l.createdAt)
        """)
    List<DailyCountProjection> countDailyByAuthorSinceExcludingStatus(
        @Param("authorId") Long authorId,
        @Param("from") LocalDateTime from,
        @Param("excludedStatus") VideoStatus excludedStatus
    );

    @Query(
        "SELECT l.video FROM LikeEntity l WHERE l.user = :user AND l.video.status = :status ORDER BY l.id DESC"
    )
    Page<Video> findLikedVideosForUser(
        @Param("user") User user,
        @Param("status") VideoStatus status,
        Pageable pageable
    );
}
