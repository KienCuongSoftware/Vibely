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

    @Query("SELECT v FROM Video v JOIN FETCH v.author WHERE v.id = :id")
    Optional<Video> findWithAuthorById(@Param("id") Long id);

    @Query("SELECT v FROM Video v JOIN FETCH v.author WHERE v.publicId = :publicId")
    Optional<Video> findWithAuthorByPublicId(@Param("publicId") UUID publicId);

    @Query("SELECT v.author.id FROM Video v WHERE v.publicId = :publicId")
    Optional<Long> findAuthorIdByPublicId(@Param("publicId") UUID publicId);

    @Query(
        value = """
            select v from Video v
            join fetch v.author a
            where v.status <> com.vibely.backend.video.VideoStatus.REMOVED
              and (
                lower(coalesce(v.title, '')) like lower(concat('%', :query, '%'))
                or lower(coalesce(v.description, '')) like lower(concat('%', :query, '%'))
                or lower(coalesce(a.username, '')) like lower(concat('%', :query, '%'))
                or lower(coalesce(a.displayName, '')) like lower(concat('%', :query, '%'))
                or lower(coalesce(a.email, '')) like lower(concat('%', :query, '%'))
              )
            order by v.createdAt desc
            """,
        countQuery = """
            select count(v) from Video v
            join v.author a
            where v.status <> com.vibely.backend.video.VideoStatus.REMOVED
              and (
                lower(coalesce(v.title, '')) like lower(concat('%', :query, '%'))
                or lower(coalesce(v.description, '')) like lower(concat('%', :query, '%'))
                or lower(coalesce(a.username, '')) like lower(concat('%', :query, '%'))
                or lower(coalesce(a.displayName, '')) like lower(concat('%', :query, '%'))
                or lower(coalesce(a.email, '')) like lower(concat('%', :query, '%'))
              )
            """
    )
    Page<Video> findAdminPosts(
        @Param("query") String query,
        Pageable pageable
    );

    @Query(
        value = """
            select v from Video v
            join fetch v.author a
            where v.status <> com.vibely.backend.video.VideoStatus.REMOVED
              and v.status = :status
              and (
                lower(coalesce(v.title, '')) like lower(concat('%', :query, '%'))
                or lower(coalesce(v.description, '')) like lower(concat('%', :query, '%'))
                or lower(coalesce(a.username, '')) like lower(concat('%', :query, '%'))
                or lower(coalesce(a.displayName, '')) like lower(concat('%', :query, '%'))
                or lower(coalesce(a.email, '')) like lower(concat('%', :query, '%'))
              )
            order by v.createdAt desc
            """,
        countQuery = """
            select count(v) from Video v
            join v.author a
            where v.status <> com.vibely.backend.video.VideoStatus.REMOVED
              and v.status = :status
              and (
                lower(coalesce(v.title, '')) like lower(concat('%', :query, '%'))
                or lower(coalesce(v.description, '')) like lower(concat('%', :query, '%'))
                or lower(coalesce(a.username, '')) like lower(concat('%', :query, '%'))
                or lower(coalesce(a.displayName, '')) like lower(concat('%', :query, '%'))
                or lower(coalesce(a.email, '')) like lower(concat('%', :query, '%'))
              )
            """
    )
    Page<Video> findAdminPostsByStatus(
        @Param("query") String query,
        @Param("status") VideoStatus status,
        Pageable pageable
    );

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

    @Query(
        value = """
            SELECT combined.video_id AS videoId,
                   combined.feed_at AS feedAt,
                   combined.reposter_id AS reposterUserId
            FROM (
                SELECT v.id AS video_id,
                       v.created_at AS feed_at,
                       CAST(NULL AS BIGINT) AS reposter_id
                FROM videos v
                WHERE v.status = 'READY'
                  AND v.author_id IN (
                      SELECT f.following_id FROM follows f WHERE f.follower_id = :followerId
                  )
                UNION ALL
                SELECT v.id AS video_id,
                       r.created_at AS feed_at,
                       r.user_id AS reposter_id
                FROM video_reposts r
                INNER JOIN videos v ON v.id = r.video_id
                WHERE v.status = 'READY'
                  AND r.user_id IN (
                      SELECT f.following_id FROM follows f WHERE f.follower_id = :followerId
                  )
            ) combined
            ORDER BY combined.feed_at DESC
            """,
        countQuery = """
            SELECT COUNT(*)
            FROM (
                SELECT v.id AS video_id
                FROM videos v
                WHERE v.status = 'READY'
                  AND v.author_id IN (
                      SELECT f.following_id FROM follows f WHERE f.follower_id = :followerId
                  )
                UNION ALL
                SELECT v.id AS video_id
                FROM video_reposts r
                INNER JOIN videos v ON v.id = r.video_id
                WHERE v.status = 'READY'
                  AND r.user_id IN (
                      SELECT f.following_id FROM follows f WHERE f.follower_id = :followerId
                  )
            ) combined
            """,
        nativeQuery = true
    )
    Page<FollowingFeedRowView> findFollowingFeedCombined(
        @Param("followerId") Long followerId,
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

    long countByIdNotAndStatusNotAndAudioUrl(Long id, VideoStatus status, String audioUrl);

    long countByAuthor_IdAndStatusNotAndIdNot(Long authorId, VideoStatus status, Long id);
}

