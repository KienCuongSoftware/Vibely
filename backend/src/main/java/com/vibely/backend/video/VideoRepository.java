package com.vibely.backend.video;

import com.vibely.backend.user.User;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface VideoRepository extends JpaRepository<Video, Long> {
    Optional<Video> findByPublicId(UUID publicId);

    @Query("SELECT v.author.id FROM Video v WHERE v.publicId = :publicId")
    Optional<Long> findAuthorIdByPublicId(@Param("publicId") UUID publicId);

    Page<Video> findByStatusOrderByCreatedAtDesc(VideoStatus status, Pageable pageable);
    Page<Video> findByAuthorInAndStatusOrderByCreatedAtDesc(Collection<User> authors, VideoStatus status, Pageable pageable);

    @Query("""
        select v from Video v
        join fetch v.author
        where v.status = :status
        and v.author.id in (
            select f.following.id from FollowEntity f where f.follower.id = :followerId
        )
        order by v.createdAt desc
        """)
    Page<Video> findReadyVideosFromFollowedCreators(
        @Param("followerId") Long followerId,
        @Param("status") VideoStatus status,
        Pageable pageable
    );
    Page<Video> findByAudioUrlAndStatusOrderByCreatedAtDesc(String audioUrl, VideoStatus status, Pageable pageable);

    /** Khớp URL âm thanh canonical hoặc cùng S3 object key (presigned GET có query khác). */
    @Query("""
        select v from Video v
        where v.status = :status
        and (v.audioUrl = :exactUrl or v.audioUrl like concat('%', :audioKey))
        order by v.createdAt desc
        """)
    Page<Video> findByAudioUrlOrKeyEndingAndStatus(
        @Param("exactUrl") String exactUrl,
        @Param("audioKey") String audioKey,
        @Param("status") VideoStatus status,
        Pageable pageable
    );

    @Query(
        value = """
            select *
            from videos v
            where v.status = :status
              and (
                coalesce(v.description, '') ~* concat('(^|[^[:alnum:]_])#', :tagRegex, '($|[^[:alnum:]_])')
                or coalesce(v.title, '') ~* concat('(^|[^[:alnum:]_])#', :tagRegex, '($|[^[:alnum:]_])')
              )
            order by v.created_at desc
            """,
        countQuery = """
            select count(*)
            from videos v
            where v.status = :status
              and (
                coalesce(v.description, '') ~* concat('(^|[^[:alnum:]_])#', :tagRegex, '($|[^[:alnum:]_])')
                or coalesce(v.title, '') ~* concat('(^|[^[:alnum:]_])#', :tagRegex, '($|[^[:alnum:]_])')
              )
            """,
        nativeQuery = true
    )
    Page<Video> findByHashtag(
        @Param("status") String status,
        @Param("tagRegex") String tagRegex,
        Pageable pageable
    );

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

    @Query("SELECT v.author.id FROM Video v WHERE v.id = :id")
    java.util.Optional<Long> findAuthorIdById(@Param("id") Long id);

    @Query("""
        select v from Video v join fetch v.author
        where v.status = :status
        order by v.createdAt desc, v.id desc
        """)
    Page<Video> findReadyFeedFirstPage(
        @Param("status") VideoStatus status,
        Pageable pageable
    );

    @Query("""
        select v from Video v join fetch v.author
        where v.status = :status
        and (v.createdAt < :cTime or (v.createdAt = :cTime and v.id < :cId))
        order by v.createdAt desc, v.id desc
        """)
    Page<Video> findReadyFeedKeyset(
        @Param("status") VideoStatus status,
        @Param("cTime") java.time.LocalDateTime cTime,
        @Param("cId") Long cId,
        Pageable pageable
    );

    @Query("""
        select v.id from Video v
        where v.author.id = :authorId and v.status = :status
        order by v.createdAt desc
        """)
    List<Long> findTopIdsByAuthorAndStatus(
        @Param("authorId") Long authorId,
        @Param("status") VideoStatus status,
        Pageable pageable
    );

    @Query("""
        select v.id from Video v
        where v.status = :status
        order by coalesce(v.rankingScore, v.exploreScore) desc, v.createdAt desc
        """)
    List<Long> findTopRankingVideoIds(@Param("status") VideoStatus status, Pageable pageable);

    @Query("""
        select v from Video v join fetch v.author where v.id in :ids
        """)
    List<Video> findWithAuthorByIdIn(@Param("ids") Collection<Long> ids);
}

