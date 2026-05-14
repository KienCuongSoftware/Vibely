package com.vibely.backend.video;

import com.vibely.backend.user.User;
import java.util.Collection;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface VideoRepository extends JpaRepository<Video, Long> {
    Page<Video> findByStatusOrderByCreatedAtDesc(VideoStatus status, Pageable pageable);
    Page<Video> findByAuthorInAndStatusOrderByCreatedAtDesc(Collection<User> authors, VideoStatus status, Pageable pageable);
    Page<Video> findByAudioUrlAndStatusOrderByCreatedAtDesc(String audioUrl, VideoStatus status, Pageable pageable);

    @Query("""
        select v from Video v
        where v.author.id = :authorId and v.status <> :excludedStatus
        order by v.createdAt desc
        """)
    Page<Video> findByAuthorIdExcludingStatus(
        @Param("authorId") Long authorId,
        @Param("excludedStatus") VideoStatus excludedStatus,
        Pageable pageable
    );

    @Query("""
        select v from Video v
        where v.author.id = :authorId and v.status = :status
        order by v.createdAt desc
        """)
    Page<Video> findByAuthorIdAndStatusEquals(
        @Param("authorId") Long authorId,
        @Param("status") VideoStatus status,
        Pageable pageable
    );

    @Query("""
        select v from Video v
        left join LikeEntity l on l.video = v
        left join CommentEntity c on c.video = v
        where v.status = :status
        group by v
        order by (count(distinct l.id) + count(distinct c.id)) desc, v.createdAt desc
        """)
    Page<Video> findTrendingByStatus(VideoStatus status, Pageable pageable);

    @Transactional
    @Modifying
    @Query("UPDATE Video v SET v.shareCount = v.shareCount + 1 WHERE v.id = :id AND v.status = :status")
    int incrementShareCount(@Param("id") Long id, @Param("status") VideoStatus status);

    @Query("""
        select v from Video v
        where v.status = :status
        and (
            :cTime is null
            or v.createdAt < :cTime
            or (v.createdAt = :cTime and v.id < :cId)
        )
        order by v.createdAt desc, v.id desc
        """)
    Page<Video> findReadyFeedKeyset(
        @Param("status") VideoStatus status,
        @Param("cTime") java.time.LocalDateTime cTime,
        @Param("cId") Long cId,
        Pageable pageable
    );
}

